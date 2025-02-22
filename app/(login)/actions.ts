'use server';

import { cookies, headers } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';

import {
  User,
  teams,
  teamMembers,
  activityLogs,
  type NewUser,
  type NewTeam,
  type NewTeamMember,
  type NewActivityLog,
  ActivityType,
  invitations,
  userProfiles,
} from '@/lib/db/schema';

import crypto from "crypto";
import { authUsers } from "drizzle-orm/supabase";
import { redirect } from 'next/navigation';
import { createCheckoutSession } from '@/lib/payments/stripe';
import { getUser, getUserWithTeam } from '@/lib/db/queries';

import {
  validatedAction,
  validatedActionWithUser,
} from '@/lib/auth/middleware';

// ========================================================================
// Helper Functions
// ========================================================================

/**
 * Generates an MD5 hash for the given email to be used with Gravatar.
 * 
 * @param {string} email - The email address to hash.
 * @returns {Promise<string>} The MD5 hash of the email.
 */
export const generateGravatarHash = async (email: string): Promise<string> => {
  const normalizedEmail = email.trim().toLowerCase();
  return crypto.createHash('md5').update(normalizedEmail).digest('hex');
};

/**
 * Checks if a Gravatar exists for the given email.
 * 
 * @param {string} email - The email address to check.
 * @returns {Promise<string|null>} The Gravatar URL if it exists, otherwise null.
 */
export const checkGravatarExists = async (email: string): Promise<string | null> => {
  const hash = await generateGravatarHash(email);
  const gravatarUrl = `https://www.gravatar.com/avatar/${hash}?d=404`;

  try {
    const response = await fetch(gravatarUrl);
    return response.status === 200 ? gravatarUrl : null;
  } catch (error) {
    console.error("Gravatar check failed:", error);
    return null;
  }
};

const validateInput = async (formData: FormData) => {
  const email = formData.get('email')?.toString();
  const password = formData.get('password')?.toString();

  if (!email || !password) {
    return { success: false, error: 'Email and password are required' };
  }

  return { success: true, email, password };
};

/**
 * Checks if a user already exists based on their email.
 * 
 * @param {string} email - The email address to check.
 * @returns {Promise<{ success: boolean, error?: string }>} Result of the check.
 */
const checkExistingUser = async (email: string) => {
  const existingUser = await db
    .select()
    .from(authUsers)
    .where(eq(authUsers.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    return {
      success: false,
      error: 'Failed to create user. User already exists.',
    };
  }
  return { success: true };
};

/**
 * Creates a user profile in the database.
 * 
 * Checks if the user's email has an associated Gravatar. If found, stores the URL;
 * otherwise, leaves the avatar field NULL.
 * 
 * @param {string} userId - The ID of the user.
 * @param {string} email - The email of the user.
 * @returns {Promise<{ success: boolean, message?: string }>} Result of the profile creation.
 */
export const createUserProfile = async (userId: string, email: string) => {
  const avatar = await checkGravatarExists(email);

  await db.insert(userProfiles).values({
    userId,
    avatar, // Will be NULL if no Gravatar exists
    role: "member",
  });

  return { success: true, message: "User profile created" };
};

/**
 * Registers a new user with Supabase authentication.
 * If successful, it creates a corresponding user profile in the database.
 */
const createUser = async (email: string, password: string) => {
  console.log("CREATE USER");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${(await headers()).get('origin')}/auth/callback`,
    },
  });

  if (error) {
    return {
      success: false,
      data,
      error: error.message,
    };
  }

  if (data?.user?.id) {
    const profileResult = await createUserProfile(data.user.id, email);
    if (!profileResult.success) {
      return { success: false, error: profileResult.message };
    }
  }

  return { success: true, message: "User created." };
};

const handleInvitation = async (inviteId: string, email: string) => {
  const [invitation] = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.id, parseInt(inviteId)),
        eq(invitations.email, email),
        eq(invitations.status, 'pending'),
      ),
    )
    .limit(1);

  if (!invitation) {
    return { success: false, error: 'Invalid or expired invitation.' };
  }

  await db
    .update(invitations)
    .set({ status: 'accepted' })
    .where(eq(invitations.id, invitation.id));

  return {
    success: true,
    teamId: invitation.teamId,
    userRole: invitation.role,
  };
};

const createTeam = async (email: string) => {
  const newTeam: NewTeam = {
    name: `${email}'s Team`,
  };

  const [createdTeam] = await db.insert(teams).values(newTeam).returning();

  if (!createdTeam) {
    return { success: false, error: 'Failed to create team. Please try again.' };
  }

  return { success: true, teamId: createdTeam.id, userRole: 'owner' };
};

const addTeamMember = async (userId: number, teamId: number, userRole: string) => {
  const newTeamMember: NewTeamMember = {
    userId,
    teamId,
    role: userRole,
  };

  await db.insert(teamMembers).values(newTeamMember);
};

// ========================================================================
// Auth Functions
// ========================================================================

export const signIn = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return redirect("/dashboard");
};

export const signUp = async (formData: FormData) => {
  const validation = await validateInput(formData);
  if (!validation.success) return validation;

  const { email, password } = validation;

  console.log("User Email and Password:", email, password);

  const existingUserCheck = await checkExistingUser(email);
  if (!existingUserCheck.success) return existingUserCheck;

  console.log("User Exists Check Passed:", existingUserCheck);

  const userCreation = await createUser(email, password);
  if (!userCreation.success) return userCreation;

  console.log("User Creation Successful:", userCreation);

  const inviteId = formData.get('inviteId')?.toString();
  let teamId, userRole;

  if (inviteId) {
    const invitationResponse = await handleInvitation(inviteId, email);
    if (!invitationResponse.success) return invitationResponse;

    teamId = invitationResponse.teamId;
    userRole = invitationResponse.userRole;
  } else {
    const teamResponse = await createTeam(email);
    if (!teamResponse.success) return teamResponse;

    teamId = teamResponse.teamId;
    userRole = teamResponse.userRole;
  }

  await addTeamMember(userCreation?.data?.user?.id, teamId, userRole);

  return {
    success: true,
    message: "Thanks for signing up! Please check your email for a verification link.",
  };
};


// ========================================================================
// Other
// ========================================================================


async function logActivity(
  teamId: number | null | undefined,
  userId: number,
  type: ActivityType,
  ipAddress?: string,
) {
  if (teamId === null || teamId === undefined) {
    return;
  }
  const newActivity: NewActivityLog = {
    teamId,
    userId,
    action: type,
    ipAddress: ipAddress || '',
  };
  await db.insert(activityLogs).values(newActivity);
}

const signInSchema = z.object({
  email: z.string().email().min(3).max(255),
  password: z.string().min(8).max(100),
});

// export const signIn = validatedAction(signInSchema, async (data, formData) => {
//   const { email, password } = data;

//   const userWithTeam = await db
//     .select({
//       user: users,
//       team: teams,
//     })
//     .from(users)
//     .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
//     .leftJoin(teams, eq(teamMembers.teamId, teams.id))
//     .where(eq(users.email, email))
//     .limit(1);

//   if (userWithTeam.length === 0) {
//     return {
//       error: 'Invalid email or password. Please try again.',
//       email,
//       password,
//     };
//   }

//   const { user: foundUser, team: foundTeam } = userWithTeam[0];

//   const isPasswordValid = await comparePasswords(
//     password,
//     foundUser.passwordHash,
//   );

//   if (!isPasswordValid) {
//     return {
//       error: 'Invalid email or password. Please try again.',
//       email,
//       password,
//     };
//   }

//   await Promise.all([
//     setSession(foundUser),
//     logActivity(foundTeam?.id, foundUser.id, ActivityType.SIGN_IN),
//   ]);

//   const redirectTo = formData.get('redirect') as string | null;
//   if (redirectTo === 'checkout') {
//     const priceId = formData.get('priceId') as string;
//     return createCheckoutSession({ team: foundTeam, priceId });
//   }

//   redirect('/dashboard');
// });



const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  inviteId: z.string().optional(),
});

// export const signUp = validatedAction(signUpSchema, async (data, formData) => {
//   const { email, password, inviteId } = data;

//   const existingUser = await db
//     .select()
//     .from(users)
//     .where(eq(users.email, email))
//     .limit(1);

//   if (existingUser.length > 0) {
//     return {
//       error: 'Failed to create user. Please try again.',
//       email,
//       password,
//     };
//   }

//   // const passwordHash = await hashPassword(password);

//   const newUser: NewUser = {
//     email,
//     passwordHash: "234",
//     role: 'owner', // Default role, will be overridden if there's an invitation
//   };

//   const [createdUser] = await db.insert(users).values(newUser).returning();

//   if (!createdUser) {
//     return {
//       error: 'Failed to create user. Please try again.',
//       email,
//       password,
//     };
//   }

//   let teamId: number;
//   let userRole: string;
//   let createdTeam: typeof teams.$inferSelect | null = null;

//   if (inviteId) {
//     // Check if there's a valid invitation
//     const [invitation] = await db
//       .select()
//       .from(invitations)
//       .where(
//         and(
//           eq(invitations.id, parseInt(inviteId)),
//           eq(invitations.email, email),
//           eq(invitations.status, 'pending'),
//         ),
//       )
//       .limit(1);

//     if (invitation) {
//       teamId = invitation.teamId;
//       userRole = invitation.role;

//       await db
//         .update(invitations)
//         .set({ status: 'accepted' })
//         .where(eq(invitations.id, invitation.id));

//       await logActivity(teamId, createdUser.id, ActivityType.ACCEPT_INVITATION);

//       [createdTeam] = await db
//         .select()
//         .from(teams)
//         .where(eq(teams.id, teamId))
//         .limit(1);
//     } else {
//       return { error: 'Invalid or expired invitation.', email, password };
//     }
//   } else {
//     // Create a new team if there's no invitation
//     const newTeam: NewTeam = {
//       name: `${email}'s Team`,
//     };

//     [createdTeam] = await db.insert(teams).values(newTeam).returning();

//     if (!createdTeam) {
//       return {
//         error: 'Failed to create team. Please try again.',
//         email,
//         password,
//       };
//     }

//     teamId = createdTeam.id;
//     userRole = 'owner';

//     await logActivity(teamId, createdUser.id, ActivityType.CREATE_TEAM);
//   }

//   const newTeamMember: NewTeamMember = {
//     userId: createdUser.id,
//     teamId: teamId,
//     role: userRole,
//   };

//   await Promise.all([
//     db.insert(teamMembers).values(newTeamMember),
//     logActivity(teamId, createdUser.id, ActivityType.SIGN_UP),
//     // setSession(createdUser),
//   ]);

//   const redirectTo = formData.get('redirect') as string | null;
//   if (redirectTo === 'checkout') {
//     const priceId = formData.get('priceId') as string;
//     return createCheckoutSession({ team: createdTeam, priceId });
//   }

//   redirect('/dashboard');
// });


// export const signUpAction = async (formData: FormData) => {
//   const email = formData.get("email")?.toString();
//   const password = formData.get("password")?.toString();
//   const supabase = await createClient();
//   const origin = (await headers()).get("origin");

//   if (!email || !password) {
//     return encodedRedirect(
//       "error",
//       IAppRoutes.AUTH_REGISTER,
//       "Email and password are required"
//     );
//   }

//   const { error } = await supabase.auth.signUp({
//     email,
//     password,
//     options: {
//       emailRedirectTo: `${origin}/auth/callback`,
//     },
//   });

//   if (error) {
//     // console.error(error.code + " " + error.message);
//     return {
//       success: false,
//       error: error.message,
//     };
//   } else {
//     return {
//       success: true,
//       message:
//         "Thanks for signing up! Please check your email for a verification link.",
//     };
//   }
// };

// export async function signOut() {
//   const user = (await getUser()) as User;
//   const userWithTeam = await getUserWithTeam(user.id);
//   await logActivity(userWithTeam?.teamId, user.id, ActivityType.SIGN_OUT);
//   (await cookies()).delete('session');
// }

const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(8).max(100),
    newPassword: z.string().min(8).max(100),
    confirmPassword: z.string().min(8).max(100),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

// export const updatePassword = validatedActionWithUser(
//   updatePasswordSchema,
//   async (data, _, user) => {
//     const { currentPassword, newPassword } = data;

//     const isPasswordValid = await comparePasswords(
//       currentPassword,
//       user.passwordHash,
//     );

//     if (!isPasswordValid) {
//       return { error: 'Current password is incorrect.' };
//     }

//     if (currentPassword === newPassword) {
//       return {
//         error: 'New password must be different from the current password.',
//       };
//     }

//     const newPasswordHash = await hashPassword(newPassword);
//     const userWithTeam = await getUserWithTeam(user.id);

//     await Promise.all([
//       db
//         .update(users)
//         .set({ passwordHash: newPasswordHash })
//         .where(eq(users.id, user.id)),
//       logActivity(userWithTeam?.teamId, user.id, ActivityType.UPDATE_PASSWORD),
//     ]);

//     return { success: 'Password updated successfully.' };
//   },
// );

const deleteAccountSchema = z.object({
  password: z.string().min(8).max(100),
});

// export const deleteAccount = validatedActionWithUser(
//   deleteAccountSchema,
//   async (data, _, user) => {
//     const { password } = data;

//     const isPasswordValid = await comparePasswords(password, user.passwordHash);
//     if (!isPasswordValid) {
//       return { error: 'Incorrect password. Account deletion failed.' };
//     }

//     const userWithTeam = await getUserWithTeam(user.id);

//     await logActivity(
//       userWithTeam?.teamId,
//       user.id,
//       ActivityType.DELETE_ACCOUNT,
//     );

//     // Soft delete
//     await db
//       .update(users)
//       .set({
//         deletedAt: sql`CURRENT_TIMESTAMP`,
//         email: sql`CONCAT(email, '-', id, '-deleted')`, // Ensure email uniqueness
//       })
//       .where(eq(users.id, user.id));

//     if (userWithTeam?.teamId) {
//       await db
//         .delete(teamMembers)
//         .where(
//           and(
//             eq(teamMembers.userId, user.id),
//             eq(teamMembers.teamId, userWithTeam.teamId),
//           ),
//         );
//     }

//     (await cookies()).delete('session');
//     redirect('/sign-in');
//   },
// );

// const updateAccountSchema = z.object({
//   name: z.string().min(1, 'Name is required').max(100),
//   email: z.string().email('Invalid email address'),
// });

// export const updateAccount = validatedActionWithUser(
//   updateAccountSchema,
//   async (data, _, user) => {
//     const { name, email } = data;
//     const userWithTeam = await getUserWithTeam(user.id);

//     await Promise.all([
//       db.update(users).set({ name, email }).where(eq(users.id, user.id)),
//       logActivity(userWithTeam?.teamId, user.id, ActivityType.UPDATE_ACCOUNT),
//     ]);

//     return { success: 'Account updated successfully.' };
//   },
// );

const removeTeamMemberSchema = z.object({
  memberId: z.number(),
});

export const removeTeamMember = validatedActionWithUser(
  removeTeamMemberSchema,
  async (data, _, user) => {
    const { memberId } = data;
    const userWithTeam = await getUserWithTeam(user.id);

    if (!userWithTeam?.teamId) {
      return { error: 'User is not part of a team' };
    }

    await db
      .delete(teamMembers)
      .where(
        and(
          eq(teamMembers.id, memberId),
          eq(teamMembers.teamId, userWithTeam.teamId),
        ),
      );

    await logActivity(
      userWithTeam.teamId,
      user.id,
      ActivityType.REMOVE_TEAM_MEMBER,
    );

    return { success: 'Team member removed successfully' };
  },
);

const inviteTeamMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['member', 'owner']),
});

// export const inviteTeamMember = validatedActionWithUser(
//   inviteTeamMemberSchema,
//   async (data, _, user) => {
//     const { email, role } = data;
//     const userWithTeam = await getUserWithTeam(user.id);

//     if (!userWithTeam?.teamId) {
//       return { error: 'User is not part of a team' };
//     }

//     const existingMember = await db
//       .select()
//       .from(users)
//       .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
//       .where(
//         and(
//           eq(users.email, email),
//           eq(teamMembers.teamId, userWithTeam.teamId),
//         ),
//       )
//       .limit(1);

//     if (existingMember.length > 0) {
//       return { error: 'User is already a member of this team' };
//     }

//     // Check if there's an existing invitation
//     const existingInvitation = await db
//       .select()
//       .from(invitations)
//       .where(
//         and(
//           eq(invitations.email, email),
//           eq(invitations.teamId, userWithTeam.teamId),
//           eq(invitations.status, 'pending'),
//         ),
//       )
//       .limit(1);

//     if (existingInvitation.length > 0) {
//       return { error: 'An invitation has already been sent to this email' };
//     }

//     // Create a new invitation
//     await db.insert(invitations).values({
//       teamId: userWithTeam.teamId,
//       email,
//       role,
//       invitedBy: user.id,
//       status: 'pending',
//     });

//     await logActivity(
//       userWithTeam.teamId,
//       user.id,
//       ActivityType.INVITE_TEAM_MEMBER,
//     );

//     // TODO: Send invitation email and include ?inviteId={id} to sign-up URL
//     // await sendInvitationEmail(email, userWithTeam.team.name, role)

//     return { success: 'Invitation sent successfully' };
//   },
// );

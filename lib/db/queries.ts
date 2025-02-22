import { desc, and, eq, isNull } from 'drizzle-orm';
import { db } from './drizzle';
import { activityLogs, teamMembers, teams } from './schema';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { authUsers } from 'drizzle-orm/supabase';

export async function getUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}


// export async function getUser() {
//   const sessionCookie = (await cookies()).get('session');
//   if (!sessionCookie || !sessionCookie.value) {
//     return null;
//   }

//   const sessionData = await verifyToken(sessionCookie.value);
//   if (
//     !sessionData ||
//     !sessionData.user ||
//     typeof sessionData.user.id !== 'number'
//   ) {
//     return null;
//   }

//   if (new Date(sessionData.expires) < new Date()) {
//     return null;
//   }

//   const user = await db
//     .select()
//     .from(users)
//     .where(and(eq(users.id, sessionData.user.id), isNull(users.deletedAt)))
//     .limit(1);

//   if (user.length === 0) {
//     return null;
//   }

//   return user[0];
// }

export async function getTeamByStripeCustomerId(customerId: string) {
  const result = await db
    .select()
    .from(teams)
    .where(eq(teams.stripeCustomerId, customerId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateTeamSubscription(
  teamId: number,
  subscriptionData: {
    stripeSubscriptionId: string | null;
    stripeProductId: string | null;
    planName: string | null;
    subscriptionStatus: string;
  }
) {
  await db
    .update(teams)
    .set({
      ...subscriptionData,
      updatedAt: new Date(),
    })
    .where(eq(teams.id, teamId));
}

export async function getUserWithTeam(userId: string) {
  const result = await db
    .select({
      user: authUsers,
      teamId: teamMembers.teamId,
    })
    .from(authUsers)
    .leftJoin(teamMembers, eq(authUsers.id, teamMembers.userId))
    .where(eq(authUsers.id, userId))
    .limit(1);

  return result[0];
}

export async function getActivityLogs() {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticateddd');
  }

  return await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      ipAddress: activityLogs.ipAddress,
      // userName: authUsers.name,
    })
    .from(activityLogs)
    .leftJoin(authUsers, eq(activityLogs.userId, authUsers.id))
    .where(eq(activityLogs.userId, user.id))
    .orderBy(desc(activityLogs.timestamp))
    .limit(10);
}

export async function getTeamForUser(userId: string) {
  const result = await db.execute(
    sql`
      SELECT 
        teams.id AS team_id,
        teams.name AS team_name,
        users.id AS user_id,
        users.email AS user_email
      FROM auth.users
      JOIN team_members ON users.id = team_members.user_id
      JOIN teams ON team_members.team_id = teams.id
      WHERE users.id = ${userId}
    `
  );

  return result.rows[0]?.team || null;
}


// export async function getTeamForUser(userId: string) {
//   const result = await db.query.authUsers.findFirst({
//     where: eq(authUsers.id, userId),
//     with: {
//       teamMembers: {
//         with: {
//           team: {
//             with: {
//               teamMembers: {
//                 with: {
//                   user: {
//                     columns: {
//                       id: true,
//                       // name: true,
//                       email: true,
//                     },
//                   },
//                 },
//               },
//             },
//           },
//         },
//       },
//     },
//   });

//   return result?.teamMembers[0]?.team || null;
// }

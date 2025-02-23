import { desc, and, eq, isNull } from 'drizzle-orm';
import { db } from './drizzle';
import { authUsers } from 'drizzle-orm/supabase';
import { ActivityLogsTable, TeamMembersTable, TeamsTable } from './schema';

import { createClient } from '@/utils/supabase/server';

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



export async function getTeamByStripeCustomerId(customerId: string) {
  const result = await db
    .select()
    .from(TeamsTable)
    .where(eq(TeamsTable.stripeCustomerId, customerId))
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
    .update(TeamsTable)
    .set({
      ...subscriptionData,
      updatedAt: new Date(),
    })
    .where(eq(TeamsTable.id, teamId));
}

export async function getUserWithTeam(userId: string) {
  const result = await db
    .select({
      user: authUsers,
      teamId: TeamMembersTable.teamId,
    })
    .from(authUsers)
    .leftJoin(TeamMembersTable, eq(authUsers.id, TeamMembersTable.userId))
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
      id: ActivityLogsTable.id,
      action: ActivityLogsTable.action,
      timestamp: ActivityLogsTable.timestamp,
      ipAddress: ActivityLogsTable.ipAddress,
      // userName: authUsers.name,
    })
    .from(ActivityLogsTable)
    .leftJoin(authUsers, eq(ActivityLogsTable.userId, authUsers.id))
    .where(eq(ActivityLogsTable.userId, user.id))
    .orderBy(desc(ActivityLogsTable.timestamp))
    .limit(10);
}

export async function getTeamForUser(userId: string) {
  const result = await db.execute(
    sql`
      SELECT 
        TeamTable.id AS team_id,
        TeamTable.name AS team_name,
        users.id AS user_id,
        users.email AS user_email
      FROM auth.users
      JOIN team_members ON users.id = team_members.user_id
      JOIN TeamTable ON team_members.team_id = TeamTable.id
      WHERE users.id = ${userId}
    `
  );

  return result.rows[0]?.team || null;
}

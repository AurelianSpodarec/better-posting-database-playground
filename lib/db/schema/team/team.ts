import { relations } from "drizzle-orm";
import { pgTable, serial, text, varchar } from "drizzle-orm/pg-core";

import { createdAt, updatedAt } from "../../schemaHelper";
import { TeamMembersTable } from "./teamMember";
import { ActivityLogsTable } from "../activityLogs";
import { InvitationsTable } from "./invitations";

export const TeamsTable = pgTable('teams', {
  id: serial().primaryKey(),
  name: varchar({ length: 100 }).notNull(),
  stripeCustomerId: text().unique(),
  stripeSubscriptionId: text().unique(),
  stripeProductId: text(),
  planName: varchar({ length: 50 }),
  subscriptionStatus: varchar({ length: 20 }),
  createdAt,
  updatedAt,
});

export const teamsRelations = relations(TeamsTable, ({ many }) => ({
  teamMembers: many(TeamMembersTable),
  activityLogs: many(ActivityLogsTable),
  invitations: many(InvitationsTable),
}));

export type Team = typeof TeamsTable.$inferSelect;
export type NewTeam = typeof TeamsTable.$inferInsert;

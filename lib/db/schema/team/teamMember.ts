import { integer, pgTable, serial, uuid, varchar } from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";

import { joinedAt } from "../../schemaHelper";
import { relations } from "drizzle-orm";
import { TeamsTable } from "./team";

export const TeamMembersTable = pgTable('team_members', {
  id: serial().primaryKey(),
  userId: uuid()
    .notNull()
    .references(() => authUsers.id),
  teamId: integer()
    .notNull()
    .references(() => TeamsTable.id),
  role: varchar({ length: 50 }).notNull(),
  joinedAt
});

export const TeamMembersTableRelations = relations(TeamMembersTable, ({ one }) => ({
  user: one(authUsers, {
    fields: [TeamMembersTable.userId],
    references: [authUsers.id],
  }),
  team: one(TeamsTable, {
    fields: [TeamMembersTable.teamId],
    references: [TeamsTable.id],
  }),
}));

export type TeamMember = typeof TeamMembersTable.$inferSelect;
export type NewTeamMember = typeof TeamMembersTable.$inferInsert;

import { integer, pgTable, serial, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";
import { relations } from "drizzle-orm";
import { TeamMembersTable } from "./teamMember";

export const InvitationsTable = pgTable('invitations', {
  id: serial().primaryKey(),
  teamId: integer()
    .notNull()
    .references(() => TeamMembersTable.id),
  email: varchar({ length: 255 }).notNull(),
  role: varchar({ length: 50 }).notNull(),
  invitedBy: uuid()
    .notNull()
    .references(() => authUsers.id),
  invitedAt: timestamp().notNull().defaultNow(),
  status: varchar({ length: 20 }).notNull().default('pending'),
});

export const invitationsRelations = relations(InvitationsTable, ({ one }) => ({
  team: one(TeamMembersTable, {
    fields: [InvitationsTable.teamId],
    references: [TeamMembersTable.id],
  }),
  invitedBy: one(authUsers, {
    fields: [InvitationsTable.invitedBy],
    references: [authUsers.id],
  }),
}));

export type Invitation = typeof InvitationsTable.$inferSelect;
export type NewInvitation = typeof InvitationsTable.$inferInsert;

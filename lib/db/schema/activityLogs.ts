import { integer, pgTable, serial, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";
import { relations } from "drizzle-orm";
import { TeamsTable } from "./team/team";

export enum ActivityType {
  SIGN_UP = 'SIGN_UP',
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
  UPDATE_PASSWORD = 'UPDATE_PASSWORD',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
  UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
  CREATE_TEAM = 'CREATE_TEAM',
  REMOVE_TEAM_MEMBER = 'REMOVE_TEAM_MEMBER',
  INVITE_TEAM_MEMBER = 'INVITE_TEAM_MEMBER',
  ACCEPT_INVITATION = 'ACCEPT_INVITATION',
}

export const ActivityLogsTable = pgTable('activity_logs', {
  id: serial().primaryKey(),
  teamId: integer()
    .notNull()
    .references(() => TeamsTable.id),
  userId: uuid().references(() => authUsers.id),
  action: text().notNull(),
  timestamp: timestamp().notNull().defaultNow(),
  ipAddress: varchar({ length: 45 }),
});

export const ActivityLogsTableRelations = relations(ActivityLogsTable, ({ one }) => ({
  team: one(TeamsTable, {
    fields: [ActivityLogsTable.teamId],
    references: [TeamsTable.id],
  }),
  user: one(authUsers, {
    fields: [ActivityLogsTable.userId],
    references: [authUsers.id],
  }),
}));

export type ActivityLog = typeof ActivityLogsTable.$inferSelect;
export type NewActivityLog = typeof ActivityLogsTable.$inferInsert;

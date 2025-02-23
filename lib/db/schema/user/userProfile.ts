import {
  pgTable,
  serial,
  varchar,
  uuid,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { authUsers } from 'drizzle-orm/supabase';
import { createdAt, deletedAt, updatedAt } from '../../schemaHelper';

import { TeamMembersTable } from '../team/teamMember';
import { InvitationsTable } from '../team/invitations';

export const userRoles = ["guest", "member", "staff", "admin", "workspaceAdmin"] as const
export type UserRole = (typeof userRoles)[number]
export const userStatusEnum = pgEnum("user_role", userRoles)

export const UserProfilesTable = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: uuid()
    .notNull()
    .references(() => authUsers.id),
  name: varchar("name", { length: 100 }),
  avatar: varchar("avatar"),
  role: userStatusEnum().notNull().default("member"),
  createdAt,
  updatedAt,
  deletedAt
});

export const usersRelations = relations(authUsers, ({ many }) => ({
  teamMembers: many(TeamMembersTable),
  invitationsSent: many(InvitationsTable),
}));

export type UserProfile = typeof UserProfilesTable.$inferSelect;
export type NewUserProfile = typeof UserProfilesTable.$inferInsert;

import { authUsers } from "drizzle-orm/supabase";

/**
 * Reference the `authUsers` table using raw SQL, as selecting directly from 
 * Supabase auth tables isn't exposed nor it's not natively supported in Drizzle ORM.
 */

export type User = typeof authUsers.$inferSelect;
export type NewUser = typeof authUsers.$inferInsert;

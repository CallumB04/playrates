import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The Supabase Auth admin surface, behind an interface.
 *
 * Every other Supabase call in this app goes through the repository bundle,
 * which route tests swap wholesale. Deleting a user is not a PostgREST table
 * operation, so it does not fit there — without this seam the delete route
 * would reach the network from the test suite.
 */
export interface AuthAdmin {
  deleteUser(userId: string): Promise<void>;
}

export const createAuthAdmin = (db: SupabaseClient): AuthAdmin => ({
  async deleteUser(userId) {
    /* Hard delete, deliberately. shouldSoftDelete defaults to false and must
       stay that way: a soft delete leaves the auth.users row in place, so
       none of the ON DELETE CASCADE chains fire and the user's logs, reviews
       and friendships all survive — the opposite of what was asked for.

       Deleting the auth user rather than the profile is also load-bearing.
       The foreign key points from profiles to auth.users, so removing the
       profile alone leaves a signed-in account that can never get a profile
       back (handle_new_user is AFTER INSERT only). */
    const { error } = await db.auth.admin.deleteUser(userId);
    if (error) throw error;
  },
});

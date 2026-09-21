import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The Supabase Auth admin surface, behind an interface so route tests can swap
 * it. Deleting a user is not a PostgREST table operation, so it doesn't fit in
 * the repository bundle.
 */
export interface AuthAdmin {
  deleteUser(userId: string): Promise<void>;
}

export const createAuthAdmin = (db: SupabaseClient): AuthAdmin => ({
  async deleteUser(userId) {
    /* Hard delete, and the auth user rather than the profile. A soft delete
       leaves the auth.users row, so no ON DELETE CASCADE fires; deleting the
       profile alone leaves an account that can never get one back, because
       handle_new_user is AFTER INSERT only. */
    const { error } = await db.auth.admin.deleteUser(userId);
    if (error) throw error;
  },
});

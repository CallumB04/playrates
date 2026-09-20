import type { Db } from "../../config/supabase.js";
import type { ProfileRow } from "../../types/database.types.js";

/** The seam that makes route tests fast: swap in an in-memory implementation
 *  and the whole HTTP stack runs with no database. */
export interface ProfilesRepository {
  findById(id: string): Promise<ProfileRow | null>;
  findByUsername(username: string): Promise<ProfileRow | null>;
  search(
    query: string | undefined,
    from: number,
    to: number,
  ): Promise<{ rows: ProfileRow[]; total: number }>;
  update(id: string, patch: Partial<ProfileRow>): Promise<ProfileRow>;
  usernameExists(username: string, excludingId?: string): Promise<boolean>;
  touchLastSeen(id: string): Promise<void>;
  count(): Promise<number>;
}

export const createProfilesRepository = (db: Db): ProfilesRepository => ({
  async findById(id) {
    const { data, error } = await db
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data as ProfileRow | null) ?? null;
  },

  async findByUsername(username) {
    const { data, error } = await db
      .from("profiles")
      .select("*")
      .eq("username", username)
      .maybeSingle();
    if (error) throw error;
    return (data as ProfileRow | null) ?? null;
  },

  async search(query, from, to) {
    let builder = db
      .from("profiles")
      .select("*", { count: "exact" })
      .order("username");

    if (query) builder = builder.ilike("username", `%${query}%`);

    const { data, error, count } = await builder.range(from, to);
    if (error) throw error;
    return { rows: (data ?? []) as ProfileRow[], total: count ?? 0 };
  },

  async update(id, patch) {
    const { data, error } = await db
      .from("profiles")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as ProfileRow;
  },

  async usernameExists(username, excludingId) {
    let builder = db
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("username", username);
    if (excludingId) builder = builder.neq("id", excludingId);

    const { count, error } = await builder;
    if (error) throw error;
    return (count ?? 0) > 0;
  },

  async touchLastSeen(id) {
    const { error } = await db
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },

  async count() {
    const { count, error } = await db
      .from("profiles")
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    return count ?? 0;
  },
});

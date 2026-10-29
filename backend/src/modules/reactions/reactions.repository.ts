import type { Db } from "../../config/supabase.js";
import type { ReactionRepo } from "../../lib/reactions.js";

/** A votes table as a ReactionRepo: `column` is the thing's id. */
export const createReactionRepo = (
  db: Db,
  table: string,
  column: string,
): ReactionRepo => ({
  async mine(userId, ids) {
    if (ids.length === 0) return new Map();
    const { data, error } = await db
      .from(table)
      .select(`${column}, reaction`)
      .eq("user_id", userId)
      .in(column, ids);
    if (error) throw error;
    return new Map(
      ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => [
        Number(r[column]),
        String(r.reaction),
      ]),
    );
  },

  async all(ids) {
    const tallies = new Map<number, string[]>();
    if (ids.length === 0) return tallies;
    const { data, error } = await db
      .from(table)
      .select(`${column}, reaction`)
      .in(column, ids);
    if (error) throw error;
    for (const r of (data ?? []) as unknown as Record<string, unknown>[]) {
      const id = Number(r[column]);
      tallies.set(id, [...(tallies.get(id) ?? []), String(r.reaction)]);
    }
    return tallies;
  },

  async of(userId, id) {
    const { data, error } = await db
      .from(table)
      .select("reaction")
      .eq("user_id", userId)
      .eq(column, id)
      .maybeSingle();
    if (error) throw error;
    return (data as { reaction: string } | null)?.reaction ?? null;
  },

  async set(userId, id, reaction) {
    const { error } = await db
      .from(table)
      .upsert(
        { user_id: userId, [column]: id, reaction },
        { onConflict: `${column},user_id` },
      );
    if (error) throw error;
  },

  async remove(userId, id) {
    const { error } = await db
      .from(table)
      .delete()
      .eq("user_id", userId)
      .eq(column, id);
    if (error) throw error;
  },

  async count(id) {
    const { count, error } = await db
      .from(table)
      .select(column, { count: "exact", head: true })
      .eq(column, id);
    if (error) throw error;
    return count ?? 0;
  },
});

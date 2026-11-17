import type { RevealTag } from "@playrates/shared";
import type { Db } from "../../../config/supabase.js";

export interface RevealRow {
  id: number;
  event_id: number;
  game_id: number | null;
  label: string | null;
  tag: RevealTag;
  position: number;
}

export type NewReveal = Omit<RevealRow, "id">;

/** A showcase's own tables, beside the event it belongs to. */
export interface ShowcaseRepository {
  /** Which of these events are showcases. */
  showcases(eventIds: number[]): Promise<number[]>;
  saveShowcase(eventId: number): Promise<void>;

  /** In running order within each event. */
  reveals(eventIds: number[]): Promise<RevealRow[]>;
  findReveal(id: number): Promise<RevealRow | null>;
  insertReveal(reveal: NewReveal): Promise<RevealRow>;
  setRevealPosition(id: number, position: number): Promise<void>;
  deleteReveal(id: number): Promise<void>;
  /** Every showing a game has had, at any showcase. */
  revealsForGame(gameId: number): Promise<RevealRow[]>;

  /** Hype per reveal across an event; one nobody's hyped for is absent. */
  hypeCounts(eventId: number): Promise<{ reveal_id: number; hype: number }[]>;
  hypeOf(userId: string, revealIds: number[]): Promise<number[]>;
  hype(userId: string, revealId: number): Promise<void>;
  unhype(userId: string, revealId: number): Promise<void>;
}

const REVEAL = "id, event_id, game_id, label, tag, position";

export const createShowcaseRepository = (db: Db): ShowcaseRepository => {
  const many = async <T>(
    query: PromiseLike<{ data: unknown; error: unknown }>,
  ): Promise<T[]> => {
    const { data, error } = await query;
    if (error) throw error;
    return (data as T[] | null) ?? [];
  };

  return {
    async showcases(eventIds) {
      if (eventIds.length === 0) return [];
      const rows = await many<{ event_id: number }>(
        db.from("showcase_events").select("event_id").in("event_id", eventIds),
      );
      return rows.map((row) => row.event_id);
    },

    async saveShowcase(eventId) {
      const { error } = await db
        .from("showcase_events")
        .upsert({ event_id: eventId }, { ignoreDuplicates: true });
      if (error) throw error;
    },

    reveals(eventIds) {
      if (eventIds.length === 0) return Promise.resolve([]);
      return many(
        db
          .from("showcase_reveals")
          .select(REVEAL)
          .in("event_id", eventIds)
          .order("position")
          .order("id"),
      );
    },

    async findReveal(id) {
      const { data, error } = await db
        .from("showcase_reveals")
        .select(REVEAL)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as RevealRow | null) ?? null;
    },

    async insertReveal(reveal) {
      const { data, error } = await db
        .from("showcase_reveals")
        .insert(reveal)
        .select(REVEAL)
        .single();
      if (error) throw error;
      return data as RevealRow;
    },

    async setRevealPosition(id, position) {
      const { error } = await db
        .from("showcase_reveals")
        .update({ position })
        .eq("id", id);
      if (error) throw error;
    },

    async deleteReveal(id) {
      const { error } = await db.from("showcase_reveals").delete().eq("id", id);
      if (error) throw error;
    },

    revealsForGame(gameId) {
      return many(
        db.from("showcase_reveals").select(REVEAL).eq("game_id", gameId),
      );
    },

    hypeCounts(eventId) {
      return many(db.rpc("showcase_hype_counts", { p_event: eventId }));
    },

    async hypeOf(userId, revealIds) {
      if (revealIds.length === 0) return [];
      const rows = await many<{ reveal_id: number }>(
        db
          .from("showcase_hype")
          .select("reveal_id")
          .eq("user_id", userId)
          .in("reveal_id", revealIds),
      );
      return rows.map((row) => row.reveal_id);
    },

    async hype(userId, revealId) {
      const { error } = await db
        .from("showcase_hype")
        .upsert(
          { user_id: userId, reveal_id: revealId },
          { onConflict: "user_id,reveal_id", ignoreDuplicates: true },
        );
      if (error) throw error;
    },

    async unhype(userId, revealId) {
      const { error } = await db
        .from("showcase_hype")
        .delete()
        .eq("user_id", userId)
        .eq("reveal_id", revealId);
      if (error) throw error;
    },
  };
};

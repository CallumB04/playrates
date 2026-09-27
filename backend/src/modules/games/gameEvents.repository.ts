import type { GameEventKind, GameEventSource } from "@playrates/shared";
import type { Db } from "../../config/supabase.js";

/** Why something happened to the catalogue. What changed in `games` is
 *  recorded by trigger; this is for what a trigger cannot see. */
export interface GameEventDraft {
  kind: GameEventKind;
  source: GameEventSource;
  gameId?: number | null;
  actorId?: string | null;
  data?: Record<string, unknown>;
}

export interface GameEventsRepository {
  record(events: GameEventDraft | GameEventDraft[]): Promise<void>;
}

export const createGameEventsRepository = (db: Db): GameEventsRepository => ({
  async record(events) {
    const list = Array.isArray(events) ? events : [events];
    if (list.length === 0) return;

    const { error } = await db.from("game_events").insert(
      list.map((event) => ({
        kind: event.kind,
        source: event.source,
        game_id: event.gameId ?? null,
        actor_id: event.actorId ?? null,
        data: event.data ?? {},
      })),
    );
    if (error) throw error;
  },
});

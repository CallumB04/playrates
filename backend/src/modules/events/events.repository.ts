import type { EventKind } from "@playrates/shared";
import type { Db } from "../../config/supabase.js";

export interface EventRow {
  id: number;
  slug: string;
  kind: EventKind;
  name: string;
  tagline: string;
  about: string;
  starts_at: string;
  ends_at: string | null;
  organiser: string;
  organiser_url: string | null;
  watch_url: string | null;
  logo: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export type NewEvent = Omit<
  EventRow,
  "id" | "published_at" | "created_at" | "updated_at"
>;

export type EventPatch = Partial<NewEvent & Pick<EventRow, "published_at">>;

/** The frame every event shares, whatever its kind, and the badges for
 *  taking part in one. */
export interface EventsRepository {
  /** The latest to start first. */
  list(publishedOnly: boolean): Promise<EventRow[]>;
  findBySlug(slug: string): Promise<EventRow | null>;
  findById(id: number): Promise<EventRow | null>;
  findByIds(ids: number[]): Promise<EventRow[]>;
  insert(event: NewEvent): Promise<EventRow>;
  update(id: number, patch: EventPatch): Promise<EventRow | null>;

  /** The badges one member has from an event, by key. */
  badgesOf(userId: string, eventId: number): Promise<string[]>;
  /** Kept as first earned when earned again. */
  grantBadge(userId: string, eventId: number, badge: string): Promise<void>;
  revokeBadge(userId: string, eventId: number, badge: string): Promise<void>;
  /** How many have each badge; one nobody has is absent. */
  badgeCounts(eventId: number): Promise<{ badge: string; earned: number }[]>;
  /** Every event badge one member holds, from any event. */
  badgesOfUser(userId: string): Promise<HeldBadgeRow[]>;
}

export interface HeldBadgeRow {
  event_id: number;
  badge: string;
  earned_at: string;
}

export const createEventsRepository = (db: Db): EventsRepository => {
  const one = async (
    query: PromiseLike<{ data: unknown; error: unknown }>,
  ): Promise<EventRow | null> => {
    const { data, error } = await query;
    if (error) throw error;
    return (data as EventRow | null) ?? null;
  };

  return {
    async list(publishedOnly) {
      let query = db.from("events").select("*");
      if (publishedOnly) query = query.not("published_at", "is", null);
      const { data, error } = await query.order("starts_at", {
        ascending: false,
      });
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },

    findBySlug(slug) {
      return one(db.from("events").select("*").eq("slug", slug).maybeSingle());
    },

    findById(id) {
      return one(db.from("events").select("*").eq("id", id).maybeSingle());
    },

    async findByIds(ids) {
      if (ids.length === 0) return [];
      const { data, error } = await db.from("events").select("*").in("id", ids);
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },

    async insert(event) {
      return (await one(db.from("events").insert(event).select("*").single()))!;
    },

    async badgesOf(userId, eventId) {
      const { data, error } = await db
        .from("event_badges")
        .select("badge")
        .eq("user_id", userId)
        .eq("event_id", eventId);
      if (error) throw error;
      return ((data ?? []) as { badge: string }[]).map((row) => row.badge);
    },

    async grantBadge(userId, eventId, badge) {
      const { error } = await db
        .from("event_badges")
        .upsert(
          { user_id: userId, event_id: eventId, badge },
          { onConflict: "user_id,event_id,badge", ignoreDuplicates: true },
        );
      if (error) throw error;
    },

    async revokeBadge(userId, eventId, badge) {
      const { error } = await db
        .from("event_badges")
        .delete()
        .eq("user_id", userId)
        .eq("event_id", eventId)
        .eq("badge", badge);
      if (error) throw error;
    },

    async badgesOfUser(userId) {
      const { data, error } = await db
        .from("event_badges")
        .select("event_id, badge, earned_at")
        .eq("user_id", userId);
      if (error) throw error;
      return (data ?? []) as HeldBadgeRow[];
    },

    async badgeCounts(eventId) {
      const { data, error } = await db.rpc("event_badge_counts", {
        p_event: eventId,
      });
      if (error) throw error;
      return (data ?? []) as { badge: string; earned: number }[];
    },

    update(id, patch) {
      return one(
        db
          .from("events")
          .update({ ...patch, updated_at: new Date().toISOString() })
          .eq("id", id)
          .select("*")
          .maybeSingle(),
      );
    },
  };
};

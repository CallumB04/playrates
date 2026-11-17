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

/** The frame every event shares, whatever its kind. */
export interface EventsRepository {
  /** The latest to start first. */
  list(publishedOnly: boolean): Promise<EventRow[]>;
  findBySlug(slug: string): Promise<EventRow | null>;
  findById(id: number): Promise<EventRow | null>;
  findByIds(ids: number[]): Promise<EventRow[]>;
  insert(event: NewEvent): Promise<EventRow>;
  update(id: number, patch: EventPatch): Promise<EventRow | null>;
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

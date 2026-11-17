import type { SupabaseClient } from "@supabase/supabase-js";
import { AVATAR_MIME } from "@playrates/shared";

const BUCKET = "event-images";

/**
 * Pictures of event nominees that aren't games, in Supabase Storage, behind
 * an interface the route tests can swap, as avatars are.
 */
export interface EventImageStore {
  /** Stores the picture and returns the URL to serve it from. */
  put(nomineeId: number, bytes: Buffer): Promise<string>;
  remove(nomineeId: number): Promise<void>;
}

// One object per nominee, replaced in place; the ?v= makes a new picture a
// new URL past any cache.
const pathFor = (nomineeId: number): string => `nominees/${nomineeId}.webp`;

export const createEventImageStore = (db: SupabaseClient): EventImageStore => ({
  async put(nomineeId, bytes) {
    const path = pathFor(nomineeId);
    const { error } = await db.storage.from(BUCKET).upload(path, bytes, {
      contentType: AVATAR_MIME,
      upsert: true,
    });
    if (error) throw error;
    const { data } = db.storage.from(BUCKET).getPublicUrl(path);
    return `${data.publicUrl}?v=${Date.now()}`;
  },

  async remove(nomineeId) {
    const { error } = await db.storage
      .from(BUCKET)
      .remove([pathFor(nomineeId)]);
    if (error) throw error;
  },
});

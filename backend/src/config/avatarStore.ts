import type { SupabaseClient } from "@supabase/supabase-js";
import { AVATAR_MIME } from "@playrates/shared";

const BUCKET = "avatars";

/**
 * Profile pictures in Supabase Storage. Like the auth admin surface, this is
 * not a PostgREST table operation, so it sits behind an interface the route
 * tests can swap.
 */
export interface AvatarStore {
  /** Stores the picture and returns the URL to serve it from. */
  put(userId: string, bytes: Buffer): Promise<string>;
  remove(userId: string): Promise<void>;
}

/* One object per user, overwritten in place. Keeping the path stable means a
   picture that is replaced leaves nothing behind to sweep up; the cost is
   that the URL does not change, which is what the ?v= below is for. */
const pathFor = (userId: string): string => `${userId}/avatar.webp`;

export const createAvatarStore = (db: SupabaseClient): AvatarStore => ({
  async put(userId, bytes) {
    const path = pathFor(userId);
    const { error } = await db.storage.from(BUCKET).upload(path, bytes, {
      contentType: AVATAR_MIME,
      upsert: true,
    });
    if (error) throw error;

    const { data } = db.storage.from(BUCKET).getPublicUrl(path);
    /* The path is stable, so a new picture at the same URL would sit behind
       whatever the browser and the CDN already cached. The version is what
       makes it a different URL. */
    return `${data.publicUrl}?v=${Date.now()}`;
  },

  async remove(userId) {
    const { error } = await db.storage.from(BUCKET).remove([pathFor(userId)]);
    if (error) throw error;
  },
});

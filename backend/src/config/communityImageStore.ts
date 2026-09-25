import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COMMUNITY_IMAGE_MIME } from "@playrates/shared";

const BUCKET = "community-images";

/**
 * Pictures posted in community messages. Behind an interface for the same
 * reason the avatar store is: storage is not a table, and route tests swap it.
 */
export interface CommunityImageStore {
  /** Stores the picture and returns the URL to serve it from. */
  put(userId: string, bytes: Buffer): Promise<string>;
  /** Whether a URL is one this store handed out. A message may only show
   *  pictures that went through the upload, not anything on the web. */
  owns(url: string): boolean;
}

export const createCommunityImageStore = (
  db: SupabaseClient,
): CommunityImageStore => {
  const prefix = db.storage.from(BUCKET).getPublicUrl("").data.publicUrl;

  return {
    async put(userId, bytes) {
      // A new name per upload: messages are edited, and an old revision's
      // picture must not change underneath it.
      const path = `${userId}/${randomUUID()}.webp`;
      const { error } = await db.storage.from(BUCKET).upload(path, bytes, {
        contentType: COMMUNITY_IMAGE_MIME,
      });
      if (error) throw error;
      return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    },

    owns(url) {
      // ".." would let a browser resolve the URL out of this bucket.
      return (
        url.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`) &&
        !url.includes("..")
      );
    },
  };
};

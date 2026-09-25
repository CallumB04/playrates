import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COMMUNITY_IMAGE_MIME } from "@playrates/shared";

const BUCKET = "community-images";

export interface StoredImage {
  url: string;
  createdAt: string;
}

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
  /** Everything this person has uploaded, posted or not. */
  listUploads(userId: string): Promise<StoredImage[]>;
  /** URLs this store did not hand out are ignored. */
  remove(urls: string[]): Promise<void>;
}

export const createCommunityImageStore = (
  db: SupabaseClient,
): CommunityImageStore => {
  const base = db.storage.from(BUCKET).getPublicUrl("").data.publicUrl;
  const prefix = base.endsWith("/") ? base : `${base}/`;

  const owns = (url: string) =>
    // ".." would let a browser resolve the URL out of this bucket.
    url.startsWith(prefix) && !url.includes("..");

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

    owns,

    async listUploads(userId) {
      const { data, error } = await db.storage
        .from(BUCKET)
        .list(userId, { limit: 1000 });
      if (error) throw error;
      // A folder placeholder comes back with no timestamp; it is not a file.
      return (data ?? []).flatMap((file) =>
        file.created_at
          ? [
              {
                url: `${prefix}${userId}/${file.name}`,
                createdAt: file.created_at,
              },
            ]
          : [],
      );
    },

    async remove(urls) {
      const paths = urls.filter(owns).map((url) => url.slice(prefix.length));
      if (paths.length === 0) return;
      const { error } = await db.storage.from(BUCKET).remove(paths);
      if (error) throw error;
    },
  };
};

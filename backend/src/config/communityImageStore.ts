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
  /** Who uploaded the picture at this URL, or null when this store did not
   *  hand it out. A message may only show its author's own uploads: a
   *  picture is deleted with the message it is in, so someone else's would
   *  be deleted from under them. */
  ownerOf(url: string): string | null;
  /** Everything this person has uploaded, posted or not. */
  listUploads(userId: string): Promise<StoredImage[]>;
  /** URLs this store did not hand out are ignored. */
  remove(urls: string[]): Promise<void>;
}

/**
 * Whether a URL points at a file in this bucket, as the upload names them:
 * `<user>/<name>.webp`. Matching the whole shape, rather than refusing "..",
 * also refuses the encoded spellings (%2e%2e, %2F) a browser would still
 * resolve out of the folder.
 */
export const storedImageOwner = (
  prefix: string,
  url: string,
): string | null => {
  if (!url.startsWith(prefix)) return null;
  const match = /^([A-Za-z0-9-]+)\/[A-Za-z0-9-]+\.webp$/.exec(
    url.slice(prefix.length),
  );
  return match?.[1] ?? null;
};

export const createCommunityImageStore = (
  db: SupabaseClient,
): CommunityImageStore => {
  const base = db.storage.from(BUCKET).getPublicUrl("").data.publicUrl;
  const prefix = base.endsWith("/") ? base : `${base}/`;

  const ownerOf = (url: string) => storedImageOwner(prefix, url);

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

    ownerOf,

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
      const paths = urls
        .filter((url) => ownerOf(url) !== null)
        .map((url) => url.slice(prefix.length));
      if (paths.length === 0) return;
      const { error } = await db.storage.from(BUCKET).remove(paths);
      if (error) throw error;
    },
  };
};

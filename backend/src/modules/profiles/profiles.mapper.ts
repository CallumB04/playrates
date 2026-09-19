import type { Profile } from "@playrates/shared";
import type { ProfileRow } from "../../types/database.types.js";

/** How recently a user must have been seen to count as online. */
const ONLINE_WINDOW_MS = 5 * 60_000;

export const isOnline = (lastSeenAt: string, now = Date.now()): boolean =>
    now - Date.parse(lastSeenAt) < ONLINE_WINDOW_MS;

/**
 * Rows are snake_case, the API is camelCase. Keeping the translation in one
 * pure function means the shape can be tested without a database.
 */
export const toProfile = (row: ProfileRow, now = Date.now()): Profile => ({
    id: row.id,
    username: row.username,
    bio: row.bio,
    pictureUrl: row.picture_url,
    online: isOnline(row.last_seen_at, now),
    createdAt: row.created_at,
});

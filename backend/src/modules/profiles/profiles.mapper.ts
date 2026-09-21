import type { Profile } from "@playrates/shared";
import type { ProfileRow } from "../../types/database.types.js";

/** How recently a user must have been seen to count as online. */
const ONLINE_WINDOW_MS = 5 * 60_000;

export const isOnline = (lastSeenAt: string, now = Date.now()): boolean =>
  now - Date.parse(lastSeenAt) < ONLINE_WINDOW_MS;

/** Rows are snake_case, the API is camelCase. Pure, so it's testable without
 *  a database. */
export const toProfile = (row: ProfileRow, now = Date.now()): Profile => ({
  id: row.id,
  username: row.username,
  firstName: row.first_name,
  bio: row.bio,
  avatarUrl: row.avatar_url,
  online: isOnline(row.last_seen_at, now),
  showSexualContent: row.show_sexual_content,
  createdAt: row.created_at,
});

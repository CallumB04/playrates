import type { MyProfile, Profile } from "@playrates/shared";
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
  // Opting out hides presence from everyone, the owner included.
  online: !row.hide_online && isOnline(row.last_seen_at, now),
  createdAt: row.created_at,
});

/** The same row for its owner, settings included. Only ever returned from a
 *  route that has established the caller is that owner. */
export const toMyProfile = (row: ProfileRow, now = Date.now()): MyProfile => ({
  ...toProfile(row, now),
  showSexualContent: row.show_sexual_content,
  timezone: row.timezone,
  hideOnline: row.hide_online,
});

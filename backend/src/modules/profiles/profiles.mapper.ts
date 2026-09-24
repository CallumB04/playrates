import type { MyProfile, Profile, ProfileAccent } from "@playrates/shared";
import { FALLBACK_ACCENT, PROFILE_ACCENT_SLUGS } from "@playrates/shared";
import type { ProfileRow } from "../../types/database.types.js";

/** How recently a user must have been seen to count as online. */
const ONLINE_WINDOW_MS = 5 * 60_000;

export const isOnline = (lastSeenAt: string, now = Date.now()): boolean =>
  now - Date.parse(lastSeenAt) < ONLINE_WINDOW_MS;

/* The column is text with a CHECK behind it, but a row read back is still
   just a string. Anything that is not one of ours falls back, so a profile is
   never returned without a colour. */
export const toAccent = (value: string | null): ProfileAccent =>
  (PROFILE_ACCENT_SLUGS as readonly string[]).includes(value ?? "")
    ? (value as ProfileAccent)
    : FALLBACK_ACCENT;

/** Rows are snake_case, the API is camelCase. Pure, so it's testable without
 *  a database. */
export const toProfile = (row: ProfileRow, now = Date.now()): Profile => ({
  id: row.id,
  username: row.username,
  firstName: row.first_name,
  bio: row.bio,
  avatarUrl: row.avatar_url,
  accent: toAccent(row.accent),
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

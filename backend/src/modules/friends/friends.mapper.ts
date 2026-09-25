import type { FriendUser } from "@playrates/shared";
import { isOnline, toAccent } from "../profiles/profiles.mapper.js";
import type { FriendProfileRow } from "./friends.repository.js";

/** The slice of a profile that travels alongside somebody else's record — a
 *  friend edge, or the actor on a notification. */
export const toFriendUser = (
  row: FriendProfileRow,
  now = Date.now(),
): FriendUser => ({
  id: row.id,
  username: row.username,
  avatarUrl: row.avatar_url,
  accent: toAccent(row.accent),
  bio: row.bio,
  online: isOnline(row.last_seen_at, now),
});

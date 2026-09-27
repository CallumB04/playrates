/**
 * Row shapes for the tables in supabase/migrations/. Hand-written for now;
 * regenerate from the live schema with:
 *
 *   npm run db:types -w backend
 */

export interface ProfileRow {
  id: string;
  username: string;
  bio: string;
  avatar_url: string | null;
  last_seen_at: string;
  /** Opt-in. Off filters games flagged has_sexual_content out of listings. */
  show_sexual_content: boolean;
  first_name: string | null;
  /** IANA zone name. Timestamps render in this; date-only columns do not. */
  timezone: string;
  /** When true, this profile reads as offline to everyone. */
  hide_online: boolean;
  /** Chosen profile colour. Null falls back to the hash of the username. */
  accent: string | null;
  /** When the first-login welcome was dismissed. Null shows it. */
  onboarded_at: string | null;
  /** Can post patch notes and remove anything in the community. */
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlatformRow {
  slug: string;
  display_name: string;
  sort_order: number;
}

export interface GameRow {
  id: number;
  rawg_id: number | null;
  slug: string;
  title: string;
  description: string;
  cover_url: string | null;
  /** Portrait art from the store, where there is any. Preferred over the
   *  landscape cover_url when the API hands a game out. */
  box_art_url: string | null;
  release_date: string | null;
  has_sexual_content: boolean;
  /** RAWG tag slugs, kept so the flag can be re-derived in place. */
  content_tags: string[];
  developers: string[];
  publishers: string[];
  website: string | null;
  esrb_rating: string | null;
  is_trending: boolean;
  playtime_hours: number | null;
  metacritic: number | null;
  rawg_rating: number | null;
  rawg_rating_count: number | null;
  rawg_added_count: number | null;
  /** PlayRates logs for this game, maintained by a trigger. */
  log_count: number;
  /** Mean PlayRates rating, also maintained by a trigger. */
  avg_rating: number | null;
  rating_count: number;
  synced_at: string | null;
  details_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GamePlatformRow {
  game_id: number;
  platform_slug: string;
}

export interface PlatformSystemRow {
  slug: string;
  display_name: string;
  platform_slug: string;
  sort_order: number;
}

export interface GameSystemRow {
  game_id: number;
  system_slug: string;
}

export interface GenreRow {
  slug: string;
  name: string;
}

export interface GameGenreRow {
  game_id: number;
  genre_slug: string;
}

export interface GameLogRow {
  id: number;
  user_id: string;
  game_id: number;
  status: string;
  played_status: string | null;
  rating: number | null;
  hours_played: number | null;
  hours_to_beat: number | null;
  start_date: string | null;
  finish_date: string | null;
  platform_slug: string | null;
  system_slug: string | null;
  achievements_total: number | null;
  achievements_completed: number | null;
  /** Generated: completed / total, null when there is nothing to divide. */
  completion: number | null;
  /** Generated: the later of start and finish, null when neither is set. */
  last_played: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewRow {
  id: number;
  user_id: string;
  game_id: number;
  body: string;
  is_public: boolean;
  /** Hides the body until a reader asks to see it. */
  contains_spoilers: boolean;
  created_at: string;
  updated_at: string;
}

export interface FriendshipRow {
  user_a_id: string;
  user_b_id: string;
  status: "pending" | "accepted";
  requested_by: string;
  created_at: string;
  updated_at: string;
}

/** Row shape of the friend_edges view. */
export interface FriendEdgeRow {
  user_id: string;
  friend_id: string;
  status: "pending" | "accepted";
  requested_by: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationRow {
  id: number;
  user_id: string;
  /** Open text, not an enum — see the notifications migration. */
  kind: string;
  actor_id: string | null;
  /** Per-kind extras, so a new kind needs no column. */
  data: Record<string, unknown>;
  dedupe_key: string | null;
  read_at: string | null;
  archived_at: string | null;
  created_at: string;
}

export interface CommunityThreadRow {
  id: number;
  subject_kind: "game" | "patch_notes";
  /** Set exactly when subject_kind is 'game'. */
  game_id: number | null;
  title: string;
  author_id: string | null;
  created_at: string;
  last_activity_at: string;
}

export interface CommunityMessageRow {
  id: number;
  thread_id: number;
  parent_id: number | null;
  author_id: string | null;
  /** Tiptap document JSON. Null once deleted. */
  body: unknown;
  is_opening: boolean;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
}

/** Written by triggers on the tables it describes. No foreign keys: it
 *  outlives what it describes. */
export interface ActivityEventRow {
  id: number;
  actor_id: string | null;
  kind: string;
  game_id: number | null;
  subject_id: string | null;
  data: Record<string, unknown>;
  created_at: string;
}

/** activity_events joined to the names and covers it points at. */
export interface AdminActivityFeedRow extends ActivityEventRow {
  actor_username: string | null;
  actor_avatar_url: string | null;
  actor_accent: string | null;
  game_title: string | null;
  game_cover_url: string | null;
  subject_username: string | null;
  message_excerpt: string | null;
}

export interface GameEventRow {
  id: number;
  kind: string;
  game_id: number | null;
  source: string | null;
  actor_id: string | null;
  data: Record<string, unknown>;
  created_at: string;
}

export interface AdminGameFeedRow extends GameEventRow {
  game_title: string | null;
  game_slug: string | null;
  game_cover_url: string | null;
  game_is_trending: boolean | null;
  game_rawg_id: number | null;
  actor_username: string | null;
}

export interface AdminUserDirectoryRow {
  id: string;
  username: string;
  avatar_url: string | null;
  accent: string | null;
  is_admin: boolean;
  created_at: string;
  last_seen_at: string;
  onboarded_at: string | null;
  log_count: number;
  review_count: number;
  message_count: number;
  friend_count: number;
  active_day_count: number;
}

export interface RawgUsageDayRow {
  /** YYYY-MM-DD, UTC. */
  day: string;
  requests: number;
  failures: number;
  last_request_at: string | null;
  last_failure_at: string | null;
  last_error: string | null;
}

export interface ServerErrorRow {
  id: number;
  status: number;
  code: string;
  method: string;
  path: string;
  message: string;
  request_id: string | null;
  user_id: string | null;
  stack: string | null;
  created_at: string;
}

export interface AnnouncementRow {
  id: number;
  tone: string;
  title: string;
  body: string;
  link_path: string | null;
  sent_by: string | null;
  recipient_count: number;
  created_at: string;
  retracted_at: string | null;
  /** The patch-notes entry this announces, when it announces one. */
  patch_note_message_id: number | null;
}

/** announcements with how many copies have been read. */
export interface AnnouncementCardRow extends AnnouncementRow {
  read_count: number;
}

/** One row of admin_series(). */
export interface AdminSeriesRow {
  bucket: string;
  signups: number;
  logs: number;
  reviews: number;
  threads: number;
  messages: number;
  active: number;
  active_week: number;
}

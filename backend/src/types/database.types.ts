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
  /** When true, the profile page asks search engines not to index it. */
  hide_from_search: boolean;
  /** everyone, friends or private: who can see this person's games. */
  games_visibility: string;
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
  /** Null only on a game from before IGDB, not yet replaced. */
  igdb_id: number | null;
  slug: string;
  title: string;
  /** The title as search matches it; kept by a trigger, never written. */
  search_title?: string | null;
  description: string;
  /** Wide art: link previews and backdrops. */
  cover_url: string | null;
  /** The picture across the top of the game page; a screenshot first. */
  banner_url: string | null;
  /** The portrait cover. Preferred whenever the API hands a game out. */
  box_art_url: string | null;
  release_date: string | null;
  has_sexual_content: boolean;
  developers: string[];
  publishers: string[];
  website: string | null;
  esrb_rating: string | null;
  is_trending: boolean;
  /** Where IGDB put it among what is trending; null when it isn't. */
  trending_rank: number | null;
  /** Professional reviews, averaged, 0-100. */
  critic_score: number | null;
  /** How many have rated it on IGDB: the catalogue's "how well known". */
  igdb_rating_count: number | null;
  /** IGDB ids of games like it; resolved against the catalogue on read. */
  similar_igdb_ids: number[];
  /** IGDB's series (a franchise, stored negative, where there is none). */
  series_id: number | null;
  series_name: string | null;
  /** Other covers: IGDB image ids, with what each one is. */
  alt_covers: { imageId: string; label: string }[];
  /** PlayRates logs for this game, maintained by a trigger. */
  log_count: number;
  /** Mean PlayRates rating, also maintained by a trigger. */
  avg_rating: number | null;
  rating_count: number;
  synced_at: string | null;
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
  /** The log it reviews: one console's run of the game. */
  log_id: number;
  body: string;
  is_public: boolean;
  /** Hides the body until a reader asks to see it. */
  contains_spoilers: boolean;
  created_at: string;
  updated_at: string;
}

/** Row shape of the game_log_rollups view: a person's logs of one game. */
export interface GameLogRollupRow {
  user_id: string;
  game_id: number;
  log_count: number;
  latest_log_id: number;
  statuses: string[];
  played_endings: string[];
  rating: number | null;
  hours_played: number | null;
  completion: number | null;
  last_played: string | null;
  updated_at: string;
  game_title: string;
  game_avg_rating: number | null;
  game_critic_score: number | null;
  game_release_date: string | null;
  hours_to_beat: number | null;
  first_added_at: string;
}

/** What user_log_stats() returns. */
export interface UserLogStatsRow {
  log_count: number;
  game_count: number;
  played: number;
  playing: number;
  backlog: number;
  wishlist: number;
  hours_played: number | null;
  average_rating: number | null;
  rated_games: number;
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
  game_igdb_id: number | null;
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

export interface IgdbUsageDayRow {
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

export interface ContentReportRow {
  id: number;
  reporter_id: string | null;
  target_type: string;
  target_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

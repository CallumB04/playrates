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

/**
 * Row shapes for the tables defined in supabase/migrations/.
 *
 * Hand-written for now so the repository layer is type-checked before a
 * Supabase project exists. Once one is linked, regenerate from the live schema
 * and this file becomes generated output:
 *
 *   npm run db:types -w backend
 */

export interface ProfileRow {
  id: string;
  username: string;
  bio: string;
  picture_url: string | null;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface PlatformRow {
  slug: string;
  display_name: string;
  icon_class: string;
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
  is_adult: boolean;
  is_trending: boolean;
  popularity: number | null;
  hours_to_beat: number | null;
  raw: unknown;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GamePlatformRow {
  game_id: number;
  platform_slug: string;
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
  achievements_total: number | null;
  achievements_completed: number | null;
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

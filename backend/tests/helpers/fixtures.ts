import type {
  FriendshipRow,
  GameLogRow,
  GameRow,
  GenreRow,
  PlatformRow,
  PlatformSystemRow,
  ProfileRow,
  ReviewRow,
} from "../../src/types/database.types.js";
import { USER_A, USER_B } from "./buildTestApp.js";

const NOW = new Date().toISOString();
const LONG_AGO = new Date("2020-01-01T00:00:00.000Z").toISOString();

export const buildProfile = (
  overrides: Partial<ProfileRow> = {},
): ProfileRow => ({
  id: USER_A,
  username: "devuser",
  bio: "",
  avatar_url: null,
  // recent, so `online` derives to true unless a test says otherwise
  show_sexual_content: false,
  first_name: null,
  timezone: "UTC",
  hide_online: false,
  accent: null,
  last_seen_at: NOW,
  created_at: LONG_AGO,
  updated_at: LONG_AGO,
  ...overrides,
});

export const buildGame = (overrides: Partial<GameRow> = {}): GameRow => ({
  id: 1,
  rawg_id: 3328,
  slug: "the-witcher-3-wild-hunt",
  title: "The Witcher 3: Wild Hunt",
  description: "An open world RPG.",
  cover_url: "https://example.test/cover.jpg",
  box_art_url: null,
  release_date: "2015-05-18",
  content_tags: [],
  developers: ["Valve"],
  publishers: ["Valve"],
  website: "https://example.test/game",
  esrb_rating: "Mature",
  has_sexual_content: false,
  is_trending: true,
  playtime_hours: 51.5,
  metacritic: 92,
  rawg_rating: 4.66,
  rawg_rating_count: 6800,
  rawg_added_count: 100,
  log_count: 0,
  avg_rating: null,
  rating_count: 0,
  synced_at: NOW,
  details_synced_at: NOW,
  created_at: LONG_AGO,
  updated_at: LONG_AGO,
  ...overrides,
});

export const buildGameLog = (
  overrides: Partial<GameLogRow> = {},
): GameLogRow => ({
  id: 1,
  user_id: USER_A,
  game_id: 1,
  status: "played",
  played_status: "finished",
  rating: 9.25,
  hours_played: 60,
  hours_to_beat: null,
  start_date: null,
  finish_date: null,
  platform_slug: "steam",
  system_slug: "steam",
  achievements_total: null,
  achievements_completed: null,
  completion: null,
  last_played: null,
  created_at: LONG_AGO,
  updated_at: LONG_AGO,
  ...overrides,
});

export const buildReview = (overrides: Partial<ReviewRow> = {}): ReviewRow => ({
  id: 1,
  user_id: USER_A,
  game_id: 1,
  body: "Still the benchmark for open world side quests.",
  is_public: true,
  created_at: LONG_AGO,
  updated_at: LONG_AGO,
  ...overrides,
});

export const buildFriendship = (
  overrides: Partial<FriendshipRow> = {},
): FriendshipRow => ({
  user_a_id: USER_A,
  user_b_id: USER_B,
  status: "pending",
  requested_by: USER_A,
  created_at: LONG_AGO,
  updated_at: LONG_AGO,
  ...overrides,
});

export const buildPlatform = (
  overrides: Partial<PlatformRow> = {},
): PlatformRow => ({
  slug: "steam",
  display_name: "Steam",
  sort_order: 10,
  ...overrides,
});

export const buildPlatformSystem = (
  overrides: Partial<PlatformSystemRow> = {},
): PlatformSystemRow => ({
  slug: "steam",
  display_name: "Steam",
  platform_slug: "steam",
  sort_order: 10,
  ...overrides,
});

/** Two users, one game, one platform — enough for most route tests. */
export const buildGenre = (overrides: Partial<GenreRow> = {}): GenreRow => ({
  slug: "action",
  name: "Action",
  ...overrides,
});

export const baseSeed = () => ({
  profiles: [
    buildProfile(),
    buildProfile({ id: USER_B, username: "frienduser" }),
  ],
  games: [buildGame()],
  gamePlatforms: [{ game_id: 1, platform_slug: "steam" }],
  gameSystems: [{ game_id: 1, system_slug: "steam" }],
  platforms: [buildPlatform()],
  platformSystems: [buildPlatformSystem()],
  genres: [buildGenre(), buildGenre({ slug: "indie", name: "Indie" })],
});

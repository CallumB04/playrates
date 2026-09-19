import type {
  FriendshipRow,
  GameLogRow,
  GameRow,
  PlatformRow,
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
  picture_url: null,
  // recent, so `online` derives to true unless a test says otherwise
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
  release_date: "2015-05-18",
  is_adult: false,
  is_trending: true,
  popularity: 100,
  hours_to_beat: 51.5,
  raw: null,
  synced_at: NOW,
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
  achievements_total: null,
  achievements_completed: null,
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
  icon_class: "fab fa-steam",
  sort_order: 10,
  ...overrides,
});

/** Two users, one game, one platform — enough for most route tests. */
export const baseSeed = () => ({
  profiles: [
    buildProfile(),
    buildProfile({ id: USER_B, username: "frienduser" }),
  ],
  games: [buildGame()],
  gamePlatforms: [{ game_id: 1, platform_slug: "steam" }],
  platforms: [buildPlatform()],
});

import type { Repositories } from "../../src/repositories.js";
import type { AuthAdmin } from "../../src/config/authAdmin.js";
import type {
  FriendshipRow,
  GameLogRow,
  GameRow,
  GenreRow,
  PlatformRow,
  ProfileRow,
  ReviewRow,
} from "../../src/types/database.types.js";
import type { GameRowWithPlatforms } from "../../src/modules/games/games.mapper.js";
import type { GameLogRowWithGame } from "../../src/modules/game-logs/gameLogs.mapper.js";
import type {
  FriendshipWithUsers,
  FriendProfileRow,
} from "../../src/modules/friends/friends.repository.js";
import { orderPair } from "../../src/modules/friends/friends.repository.js";
import type { ReviewRowJoined } from "../../src/modules/reviews/reviews.repository.js";

/**
 * Behaviour-equivalent in-memory repositories.
 *
 * Faking at this layer rather than mocking the Supabase client is deliberate:
 * mocking `.from().select().eq()` chains asserts on query-builder calls rather
 * than on behaviour, and breaks whenever a query is rewritten. These survive
 * query rewrites because they implement the same contract.
 */
export interface SeedData {
  profiles?: ProfileRow[];
  games?: GameRow[];
  gamePlatforms?: { game_id: number; platform_slug: string }[];
  gameLogs?: GameLogRow[];
  reviews?: ReviewRow[];
  friendships?: FriendshipRow[];
  platforms?: PlatformRow[];
  genres?: GenreRow[];
}

export interface InMemoryState {
  profiles: ProfileRow[];
  games: GameRow[];
  gamePlatforms: { game_id: number; platform_slug: string }[];
  gameLogs: GameLogRow[];
  reviews: ReviewRow[];
  friendships: FriendshipRow[];
  platforms: PlatformRow[];
  genres: GenreRow[];
}

const now = () => new Date("2026-01-01T00:00:00.000Z").toISOString();

export const createInMemoryRepos = (
  seed: SeedData = {},
): {
  repos: Repositories;
  state: InMemoryState;
  authAdmin: AuthAdmin;
} => {
  const state: InMemoryState = {
    profiles: [...(seed.profiles ?? [])],
    games: [...(seed.games ?? [])],
    gamePlatforms: [...(seed.gamePlatforms ?? [])],
    gameLogs: [...(seed.gameLogs ?? [])],
    reviews: [...(seed.reviews ?? [])],
    friendships: [...(seed.friendships ?? [])],
    platforms: [...(seed.platforms ?? [])],
    genres: [...(seed.genres ?? [])],
  };

  let nextLogId = 1000;
  let nextReviewId = 2000;
  let nextGameId = 3000;

  const withPlatforms = (game: GameRow): GameRowWithPlatforms => ({
    ...game,
    game_platforms: state.gamePlatforms
      .filter((gp) => gp.game_id === game.id)
      .map((gp) => ({ platform_slug: gp.platform_slug })),
  });

  const withGame = (log: GameLogRow): GameLogRowWithGame => {
    const game = state.games.find((g) => g.id === log.game_id);
    return { ...log, game: game ? withPlatforms(game) : null };
  };

  const asFriendProfile = (p: ProfileRow): FriendProfileRow => ({
    id: p.id,
    username: p.username,
    avatar_url: p.avatar_url,
    bio: p.bio,
    last_seen_at: p.last_seen_at,
  });

  const withUsers = (f: FriendshipRow): FriendshipWithUsers => {
    const a = state.profiles.find((p) => p.id === f.user_a_id);
    const b = state.profiles.find((p) => p.id === f.user_b_id);
    return {
      ...f,
      user_a: a ? asFriendProfile(a) : null,
      user_b: b ? asFriendProfile(b) : null,
    };
  };

  /* Mirrors the review_cards view: the review with its author and the
     author's log of that game flattened onto one row. */
  const withAuthor = (r: ReviewRow): ReviewRowJoined => {
    const author = state.profiles.find((p) => p.id === r.user_id);
    const log = state.gameLogs.find(
      (l) => l.user_id === r.user_id && l.game_id === r.game_id,
    );
    return {
      ...r,
      rating: log?.rating ?? null,
      platform_slug: log?.platform_slug ?? null,
      author_username: author?.username ?? null,
      author_avatar_url: author?.avatar_url ?? null,
      author_last_seen_at: author?.last_seen_at ?? null,
    };
  };

  const repos: Repositories = {
    profiles: {
      async findById(id) {
        return state.profiles.find((p) => p.id === id) ?? null;
      },
      async findByUsername(username) {
        return (
          state.profiles.find(
            (p) => p.username.toLowerCase() === username.toLowerCase(),
          ) ?? null
        );
      },
      async search(query, from, to) {
        const matched = state.profiles.filter((p) =>
          query ? p.username.toLowerCase().includes(query.toLowerCase()) : true,
        );
        return { rows: matched.slice(from, to + 1), total: matched.length };
      },
      async update(id, patch) {
        const index = state.profiles.findIndex((p) => p.id === id);
        if (index === -1) throw new Error("profile not found");
        const updated = {
          ...state.profiles[index]!,
          ...patch,
          updated_at: now(),
        };
        state.profiles[index] = updated;
        return updated;
      },
      async usernameExists(username, excludingId) {
        return state.profiles.some(
          (p) =>
            p.username.toLowerCase() === username.toLowerCase() &&
            p.id !== excludingId,
        );
      },
      async touchLastSeen(id) {
        const profile = state.profiles.find((p) => p.id === id);
        if (profile) profile.last_seen_at = now();
      },
      async count() {
        return state.profiles.length;
      },
    },

    games: {
      async findById(id) {
        const game = state.games.find((g) => g.id === id);
        return game ? withPlatforms(game) : null;
      },
      async findByRawgId(rawgId) {
        const game = state.games.find((g) => g.rawg_id === rawgId);
        return game ? withPlatforms(game) : null;
      },
      async list(query, from, to, excludeLoggedForUser, showSexualContent) {
        let rows = state.games;

        if (query.search) {
          const term = query.search.toLowerCase();
          rows = rows.filter((g) => g.title.toLowerCase().includes(term));
        }
        if (query.trending !== undefined) {
          rows = rows.filter((g) => g.is_trending === query.trending);
        }
        if (!showSexualContent) {
          rows = rows.filter((g) => !g.has_sexual_content);
        }
        if (query.platform) {
          const ids = new Set(
            state.gamePlatforms
              .filter((gp) => gp.platform_slug === query.platform)
              .map((gp) => gp.game_id),
          );
          rows = rows.filter((g) => ids.has(g.id));
        }
        if (excludeLoggedForUser) {
          const logged = new Set(
            state.gameLogs
              .filter((l) => l.user_id === excludeLoggedForUser)
              .map((l) => l.game_id),
          );
          rows = rows.filter((g) => !logged.has(g.id));
        }

        if (query.releasedAfter) {
          rows = rows.filter(
            (g) => g.release_date !== null && g.release_date >= query.releasedAfter!,
          );
        }
        if (query.releasedBefore) {
          rows = rows.filter(
            (g) => g.release_date !== null && g.release_date <= query.releasedBefore!,
          );
        }

        // Mirrors the SQL sort map, tiebreaker included.
        const by = {
          title: (a: GameRow, b: GameRow) => a.title.localeCompare(b.title),
          released: (a: GameRow, b: GameRow) =>
            (b.release_date ?? "").localeCompare(a.release_date ?? ""),
          rating: (a: GameRow, b: GameRow) =>
            (b.rawg_rating ?? 0) - (a.rawg_rating ?? 0),
          popular: (a: GameRow, b: GameRow) =>
            (b.rawg_added_count ?? 0) - (a.rawg_added_count ?? 0),
          logged: (a: GameRow, b: GameRow) => b.log_count - a.log_count,
        } as const;
        const compare = by[query.sort ?? "popular"];
        const sorted = [...rows].sort((a, b) => compare(a, b) || a.id - b.id);
        return {
          rows: sorted.slice(from, to + 1).map(withPlatforms),
          total: sorted.length,
        };
      },
      async searchLocal(term, limit) {
        return state.games
          .filter((g) => g.title.toLowerCase().includes(term.toLowerCase()))
          .slice(0, limit)
          .map(withPlatforms);
      },
      async upsertMany(games) {
        const ids: number[] = [];
        for (const external of games) {
          const found = state.games.find(
            (g) => g.rawg_id === external.externalId,
          );
          let existing: GameRow;
          if (!found) {
            existing = {
              id: nextGameId++,
              rawg_id: external.externalId,
              slug: external.slug,
              title: external.title,
              description: external.description,
              cover_url: external.coverUrl,
              release_date: external.releaseDate,
              has_sexual_content: external.hasSexualContent,
              content_tags: external.contentTags,
              is_trending: false,
              playtime_hours: external.playtimeHours,
              metacritic: external.metacritic,
              rawg_rating: external.rawgRating,
              rawg_rating_count: external.rawgRatingCount,
              rawg_added_count: external.rawgAddedCount,
              log_count: 0,
              synced_at: now(),
              description_synced_at: external.description ? now() : null,
              created_at: now(),
              updated_at: now(),
            };
            state.games.push(existing);
          } else {
            existing = found;
            Object.assign(existing, {
              title: external.title,
              description: external.description,
              cover_url: external.coverUrl,
              synced_at: now(),
            });
          }

          state.gamePlatforms = state.gamePlatforms.filter(
            (gp) => gp.game_id !== existing.id,
          );
          for (const slug of external.platformSlugs) {
            state.gamePlatforms.push({
              game_id: existing.id,
              platform_slug: slug,
            });
          }
          ids.push(existing.id);
        }
        return ids;
      },
      async refreshFromExternal(id, fields) {
        const game = state.games.find((g) => g.id === id);
        if (game) {
          game.description = fields.description;
          game.content_tags = fields.contentTags;
          game.has_sexual_content = fields.hasSexualContent;
          game.description_synced_at = now();
        }
      },
      async statusCounts(gameId) {
        const counts: Record<string, number> = {
          played: 0,
          playing: 0,
          backlog: 0,
          wishlist: 0,
        };
        for (const log of state.gameLogs.filter((l) => l.game_id === gameId)) {
          counts[log.status] = (counts[log.status] ?? 0) + 1;
        }
        return counts;
      },
      async ratingSummary(gameId) {
        const ratings = state.gameLogs
          .filter((l) => l.game_id === gameId && l.rating !== null)
          .map((l) => Number(l.rating));
        const buckets = new Array<number>(20).fill(0);
        for (const rating of ratings) {
          const index = Math.min(19, Math.floor(rating * 2));
          buckets[index] = (buckets[index] ?? 0) + 1;
        }
        if (ratings.length === 0) return { average: null, count: 0, buckets };
        const sum = ratings.reduce((a, b) => a + b, 0);
        return {
          average: Math.round((sum / ratings.length) * 100) / 100,
          count: ratings.length,
          buckets,
        };
      },
      async count() {
        return state.games.length;
      },
    },

    gameLogs: {
      async listByUser(userId, status, from, to) {
        const rows = state.gameLogs.filter(
          (l) => l.user_id === userId && (status ? l.status === status : true),
        );
        return {
          rows: rows.slice(from, to + 1).map(withGame),
          total: rows.length,
        };
      },
      async findByUserAndGame(userId, gameId) {
        const log = state.gameLogs.find(
          (l) => l.user_id === userId && l.game_id === gameId,
        );
        return log ? withGame(log) : null;
      },
      async upsert(userId, gameId, patch) {
        const existing = state.gameLogs.find(
          (l) => l.user_id === userId && l.game_id === gameId,
        );
        if (existing) {
          Object.assign(existing, patch, { updated_at: now() });
          return { row: withGame(existing), created: false };
        }
        const row: GameLogRow = {
          id: nextLogId++,
          user_id: userId,
          game_id: gameId,
          status: "played",
          played_status: null,
          rating: null,
          hours_played: null,
          hours_to_beat: null,
          start_date: null,
          finish_date: null,
          platform_slug: null,
          achievements_total: null,
          achievements_completed: null,
          created_at: now(),
          updated_at: now(),
          ...patch,
        };
        state.gameLogs.push(row);
        return { row: withGame(row), created: true };
      },
      async update(id, patch) {
        const log = state.gameLogs.find((l) => l.id === id);
        if (!log) throw new Error("game log not found");
        Object.assign(log, patch, { updated_at: now() });
        return withGame(log);
      },
      async remove(id) {
        state.gameLogs = state.gameLogs.filter((l) => l.id !== id);
      },
      async count() {
        return state.gameLogs.length;
      },
      async summariesByUser(userId) {
        return state.gameLogs
          .filter((l) => l.user_id === userId)
          .map((l) => ({
            game_id: l.game_id,
            status: l.status,
            played_status: l.played_status,
            rating: l.rating,
          }));
      },
      async statsByUser(userId, year) {
        const rows = state.gameLogs.filter(
          (l) =>
            l.user_id === userId &&
            (year === undefined ||
              new Date(l.updated_at).getUTCFullYear() === year),
        );

        const byStatus: Record<string, number> = {
          played: 0,
          playing: 0,
          backlog: 0,
          wishlist: 0,
        };
        let hoursPlayed = 0;
        let ratingSum = 0;
        let ratingCount = 0;

        for (const row of rows) {
          byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
          if (row.hours_played !== null) hoursPlayed += Number(row.hours_played);
          if (row.rating !== null) {
            ratingSum += Number(row.rating);
            ratingCount += 1;
          }
        }

        return {
          byStatus,
          hoursPlayed: Math.round(hoursPlayed * 10) / 10,
          averageRating:
            ratingCount === 0
              ? null
              : Math.round((ratingSum / ratingCount) * 100) / 100,
          ratingCount,
        };
      },
    },

    reviews: {
      async listByGame(gameId, viewerId, from, to, sort) {
        const rows = state.reviews
          .filter(
            (r) =>
              r.game_id === gameId && (r.is_public || r.user_id === viewerId),
          )
          .sort((a, b) => {
            if (sort === "rating-high" || sort === "rating-low") {
              const ra = withAuthor(a).rating;
              const rb = withAuthor(b).rating;
              // Unrated last, whichever direction.
              if (ra === null || rb === null) {
                if (ra !== rb) return ra === null ? 1 : -1;
              } else if (ra !== rb) {
                return sort === "rating-high" ? rb - ra : ra - rb;
              }
              return a.id - b.id;
            }
            const delta = a.created_at.localeCompare(b.created_at);
            return (sort === "oldest" ? delta : -delta) || a.id - b.id;
          });
        return {
          rows: rows.slice(from, to + 1).map(withAuthor),
          total: rows.length,
        };
      },
      async listByUser(userId, viewerId, from, to) {
        const rows = state.reviews.filter(
          (r) => r.user_id === userId && (viewerId === userId || r.is_public),
        );
        return {
          rows: rows.slice(from, to + 1).map(withAuthor),
          total: rows.length,
        };
      },
      async findByUserAndGame(userId, gameId) {
        const review = state.reviews.find(
          (r) => r.user_id === userId && r.game_id === gameId,
        );
        return review ? withAuthor(review) : null;
      },
      async upsert(userId, gameId, patch) {
        const existing = state.reviews.find(
          (r) => r.user_id === userId && r.game_id === gameId,
        );
        if (existing) {
          Object.assign(existing, patch, { updated_at: now() });
          return { row: withAuthor(existing), created: false };
        }
        const row: ReviewRow = {
          id: nextReviewId++,
          user_id: userId,
          game_id: gameId,
          created_at: now(),
          updated_at: now(),
          ...patch,
        };
        state.reviews.push(row);
        return { row: withAuthor(row), created: true };
      },
      async remove(id) {
        state.reviews = state.reviews.filter((r) => r.id !== id);
      },
    },

    friends: {
      async listForUser(userId) {
        return state.friendships
          .filter((f) => f.user_a_id === userId || f.user_b_id === userId)
          .map(withUsers);
      },
      async find(x, y) {
        const [a, b] = orderPair(x, y);
        return (
          state.friendships.find(
            (f) => f.user_a_id === a && f.user_b_id === b,
          ) ?? null
        );
      },
      async create(requesterId, targetId) {
        const [a, b] = orderPair(requesterId, targetId);
        const row: FriendshipRow = {
          user_a_id: a,
          user_b_id: b,
          status: "pending",
          requested_by: requesterId,
          created_at: now(),
          updated_at: now(),
        };
        state.friendships.push(row);
        return withUsers(row);
      },
      async accept(x, y) {
        const [a, b] = orderPair(x, y);
        const row = state.friendships.find(
          (f) => f.user_a_id === a && f.user_b_id === b,
        );
        if (!row) throw new Error("friendship not found");
        row.status = "accepted";
        return withUsers(row);
      },
      async remove(x, y) {
        const [a, b] = orderPair(x, y);
        state.friendships = state.friendships.filter(
          (f) => !(f.user_a_id === a && f.user_b_id === b),
        );
      },
    },

    platforms: {
      async list() {
        return [...state.platforms].sort((a, b) => a.sort_order - b.sort_order);
      },
    },

    genres: {
      async list() {
        return [...state.genres].sort((a, b) =>
          a.name.localeCompare(b.name),
        );
      },
    },
  };

  /* Emulates what Postgres does on delete. Every FK pointing at profiles is
     ON DELETE CASCADE, so removing the user takes their logs, reviews and
     friendships with it — a fake that only dropped the profile would let a
     broken cascade pass the tests. */
  const authAdmin: AuthAdmin = {
    async deleteUser(userId) {
      state.profiles = state.profiles.filter((p) => p.id !== userId);
      state.gameLogs = state.gameLogs.filter((l) => l.user_id !== userId);
      state.reviews = state.reviews.filter((r) => r.user_id !== userId);
      state.friendships = state.friendships.filter(
        (f) => f.user_a_id !== userId && f.user_b_id !== userId,
      );
    },
  };

  return { repos, state, authAdmin };
};

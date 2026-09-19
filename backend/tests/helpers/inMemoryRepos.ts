import type { Repositories } from "../../src/repositories.js";
import type {
    FriendshipRow,
    GameLogRow,
    GameRow,
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
import {
    ratingKey,
    type ReviewRowJoined,
} from "../../src/modules/reviews/reviews.repository.js";

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
}

export interface InMemoryState {
    profiles: ProfileRow[];
    games: GameRow[];
    gamePlatforms: { game_id: number; platform_slug: string }[];
    gameLogs: GameLogRow[];
    reviews: ReviewRow[];
    friendships: FriendshipRow[];
    platforms: PlatformRow[];
}

const now = () => new Date("2026-01-01T00:00:00.000Z").toISOString();

export const createInMemoryRepos = (
    seed: SeedData = {}
): { repos: Repositories; state: InMemoryState } => {
    const state: InMemoryState = {
        profiles: [...(seed.profiles ?? [])],
        games: [...(seed.games ?? [])],
        gamePlatforms: [...(seed.gamePlatforms ?? [])],
        gameLogs: [...(seed.gameLogs ?? [])],
        reviews: [...(seed.reviews ?? [])],
        friendships: [...(seed.friendships ?? [])],
        platforms: [...(seed.platforms ?? [])],
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
        picture_url: p.picture_url,
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

    const withAuthor = (r: ReviewRow): ReviewRowJoined => {
        const author = state.profiles.find((p) => p.id === r.user_id);
        return {
            ...r,
            author: author
                ? {
                      id: author.id,
                      username: author.username,
                      picture_url: author.picture_url,
                      last_seen_at: author.last_seen_at,
                  }
                : null,
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
                        (p) =>
                            p.username.toLowerCase() === username.toLowerCase()
                    ) ?? null
                );
            },
            async search(query, from, to) {
                const matched = state.profiles.filter((p) =>
                    query
                        ? p.username.toLowerCase().includes(query.toLowerCase())
                        : true
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
                        p.id !== excludingId
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
            async list(query, from, to, excludeLoggedForUser) {
                let rows = state.games;

                if (query.search) {
                    const term = query.search.toLowerCase();
                    rows = rows.filter((g) =>
                        g.title.toLowerCase().includes(term)
                    );
                }
                if (query.trending !== undefined) {
                    rows = rows.filter((g) => g.is_trending === query.trending);
                }
                if (!query.includeAdult) {
                    rows = rows.filter((g) => !g.is_adult);
                }
                if (query.platform) {
                    const ids = new Set(
                        state.gamePlatforms
                            .filter((gp) => gp.platform_slug === query.platform)
                            .map((gp) => gp.game_id)
                    );
                    rows = rows.filter((g) => ids.has(g.id));
                }
                if (excludeLoggedForUser) {
                    const logged = new Set(
                        state.gameLogs
                            .filter((l) => l.user_id === excludeLoggedForUser)
                            .map((l) => l.game_id)
                    );
                    rows = rows.filter((g) => !logged.has(g.id));
                }

                const sorted = [...rows].sort((a, b) =>
                    a.title.localeCompare(b.title)
                );
                return {
                    rows: sorted.slice(from, to + 1).map(withPlatforms),
                    total: sorted.length,
                };
            },
            async searchLocal(term, limit) {
                return state.games
                    .filter((g) =>
                        g.title.toLowerCase().includes(term.toLowerCase())
                    )
                    .slice(0, limit)
                    .map(withPlatforms);
            },
            async upsertMany(games) {
                const ids: number[] = [];
                for (const external of games) {
                    let existing = state.games.find(
                        (g) => g.rawg_id === external.externalId
                    );
                    if (!existing) {
                        existing = {
                            id: nextGameId++,
                            rawg_id: external.externalId,
                            slug: external.slug,
                            title: external.title,
                            description: external.description,
                            cover_url: external.coverUrl,
                            release_date: external.releaseDate,
                            is_adult: external.isAdult,
                            is_trending: false,
                            popularity: external.popularity,
                            hours_to_beat: external.hoursToBeat,
                            raw: external.raw,
                            synced_at: now(),
                            created_at: now(),
                            updated_at: now(),
                        };
                        state.games.push(existing);
                    } else {
                        Object.assign(existing, {
                            title: external.title,
                            description: external.description,
                            cover_url: external.coverUrl,
                            synced_at: now(),
                        });
                    }

                    state.gamePlatforms = state.gamePlatforms.filter(
                        (gp) => gp.game_id !== existing!.id
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
            async statusCounts(gameId) {
                const counts: Record<string, number> = {
                    played: 0,
                    playing: 0,
                    backlog: 0,
                    wishlist: 0,
                };
                for (const log of state.gameLogs.filter(
                    (l) => l.game_id === gameId
                )) {
                    counts[log.status] = (counts[log.status] ?? 0) + 1;
                }
                return counts;
            },
            async ratingSummary(gameId) {
                const ratings = state.gameLogs
                    .filter((l) => l.game_id === gameId && l.rating !== null)
                    .map((l) => Number(l.rating));
                if (ratings.length === 0) return { average: null, count: 0 };
                const sum = ratings.reduce((a, b) => a + b, 0);
                return {
                    average: Math.round((sum / ratings.length) * 100) / 100,
                    count: ratings.length,
                };
            },
            async count() {
                return state.games.length;
            },
        },

        gameLogs: {
            async listByUser(userId, status, from, to) {
                const rows = state.gameLogs.filter(
                    (l) =>
                        l.user_id === userId && (status ? l.status === status : true)
                );
                return {
                    rows: rows.slice(from, to + 1).map(withGame),
                    total: rows.length,
                };
            },
            async findByUserAndGame(userId, gameId) {
                const log = state.gameLogs.find(
                    (l) => l.user_id === userId && l.game_id === gameId
                );
                return log ? withGame(log) : null;
            },
            async upsert(userId, gameId, patch) {
                const existing = state.gameLogs.find(
                    (l) => l.user_id === userId && l.game_id === gameId
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
        },

        reviews: {
            async listByGame(gameId, viewerId, from, to) {
                const rows = state.reviews.filter(
                    (r) =>
                        r.game_id === gameId &&
                        (r.is_public || r.user_id === viewerId)
                );
                return {
                    rows: rows.slice(from, to + 1).map(withAuthor),
                    total: rows.length,
                };
            },
            async listByUser(userId, viewerId, from, to) {
                const rows = state.reviews.filter(
                    (r) =>
                        r.user_id === userId &&
                        (viewerId === userId || r.is_public)
                );
                return {
                    rows: rows.slice(from, to + 1).map(withAuthor),
                    total: rows.length,
                };
            },
            async findByUserAndGame(userId, gameId) {
                const review = state.reviews.find(
                    (r) => r.user_id === userId && r.game_id === gameId
                );
                return review ? withAuthor(review) : null;
            },
            async upsert(userId, gameId, patch) {
                const existing = state.reviews.find(
                    (r) => r.user_id === userId && r.game_id === gameId
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
            async ratingsFor(pairs) {
                const map = new Map<
                    string,
                    { rating: number | null; platform: string | null }
                >();
                for (const { userId, gameId } of pairs) {
                    const log = state.gameLogs.find(
                        (l) => l.user_id === userId && l.game_id === gameId
                    );
                    if (log) {
                        map.set(ratingKey(userId, gameId), {
                            rating: log.rating === null ? null : Number(log.rating),
                            platform: log.platform_slug,
                        });
                    }
                }
                return map;
            },
        },

        friends: {
            async listForUser(userId) {
                return state.friendships
                    .filter(
                        (f) => f.user_a_id === userId || f.user_b_id === userId
                    )
                    .map(withUsers);
            },
            async find(x, y) {
                const [a, b] = orderPair(x, y);
                return (
                    state.friendships.find(
                        (f) => f.user_a_id === a && f.user_b_id === b
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
                    (f) => f.user_a_id === a && f.user_b_id === b
                );
                if (!row) throw new Error("friendship not found");
                row.status = "accepted";
                return withUsers(row);
            },
            async remove(x, y) {
                const [a, b] = orderPair(x, y);
                state.friendships = state.friendships.filter(
                    (f) => !(f.user_a_id === a && f.user_b_id === b)
                );
            },
        },

        platforms: {
            async list() {
                return [...state.platforms].sort(
                    (a, b) => a.sort_order - b.sort_order
                );
            },
        },
    };

    return { repos, state };
};

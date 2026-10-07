import type { ExternalGame } from "../../src/providers/games/GamesProvider.js";
import { searchKey } from "../../src/lib/searchKey.js";
import { AppError } from "../../src/lib/AppError.js";
import {
  logRank,
  type GameStatus,
  type PlayedStatus,
} from "@playrates/shared";
import type { Repositories } from "../../src/repositories.js";
import type { AuthAdmin } from "../../src/config/authAdmin.js";
import type { AvatarStore } from "../../src/config/avatarStore.js";
import {
  isStoredImageUrl,
  type CommunityImageStore,
} from "../../src/config/communityImageStore.js";
import type {
  ActivityEventRow,
  AnnouncementRow,
  GameEventRow,
  IgdbUsageDayRow,
  ServerErrorRow,
  ContentReportRow,
  CommunityMessageRow,
  CommunityThreadRow,
  FriendshipRow,
  GameLogRow,
  GameRow,
  GenreRow,
  NotificationRow,
  PlatformRow,
  PlatformSystemRow,
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
import type { NotificationRowWithActor } from "../../src/modules/notifications/notifications.repository.js";
import { createInMemoryCommunity } from "./inMemoryCommunity.js";
import { createInMemoryAdmin, createInMemoryGameEvents } from "./inMemoryAdmin.js";

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
  gameSystems?: { game_id: number; system_slug: string }[];
  gameLogs?: GameLogRow[];
  reviews?: ReviewRow[];
  friendships?: FriendshipRow[];
  notifications?: NotificationRow[];
  platforms?: PlatformRow[];
  platformSystems?: PlatformSystemRow[];
  genres?: GenreRow[];
  communityThreads?: CommunityThreadRow[];
  communityMessages?: CommunityMessageRow[];
  communityVotes?: { message_id: number; user_id: string }[];
  activityEvents?: ActivityEventRow[];
  gameEvents?: GameEventRow[];
  igdbUsage?: IgdbUsageDayRow[];
  serverErrors?: ServerErrorRow[];
  contentReports?: ContentReportRow[];
}

export interface InMemoryState {
  profiles: ProfileRow[];
  games: GameRow[];
  gamePlatforms: { game_id: number; platform_slug: string }[];
  gameSystems: { game_id: number; system_slug: string }[];
  gameLogs: GameLogRow[];
  reviews: ReviewRow[];
  reviewVotes: { review_id: number; user_id: string }[];
  friendships: FriendshipRow[];
  notifications: NotificationRow[];
  platforms: PlatformRow[];
  platformSystems: PlatformSystemRow[];
  genres: GenreRow[];
  /** Stored profile pictures, by user id. */
  avatars: Map<string, Buffer>;
  communityThreads: CommunityThreadRow[];
  communityMessages: CommunityMessageRow[];
  communityVotes: { message_id: number; user_id: string }[];
  /** Pictures uploaded to messages, by URL. */
  communityImages: Map<string, { bytes: Buffer; createdAt: string }>;
  /** Written by triggers in Postgres; seeded directly here. */
  activityEvents: ActivityEventRow[];
  gameEvents: GameEventRow[];
  igdbUsage: IgdbUsageDayRow[];
  serverErrors: ServerErrorRow[];
  announcements: AnnouncementRow[];
  contentReports: ContentReportRow[];
}

const now = () => new Date("2026-01-01T00:00:00.000Z").toISOString();

export const createInMemoryRepos = (
  seed: SeedData = {},
): {
  repos: Repositories;
  state: InMemoryState;
  authAdmin: AuthAdmin;
  avatars: AvatarStore;
  communityImages: CommunityImageStore;
} => {
  const state: InMemoryState = {
    profiles: [...(seed.profiles ?? [])],
    games: [...(seed.games ?? [])],
    gamePlatforms: [...(seed.gamePlatforms ?? [])],
    gameSystems: [...(seed.gameSystems ?? [])],
    gameLogs: [...(seed.gameLogs ?? [])],
    reviews: [...(seed.reviews ?? [])],
    reviewVotes: [],
    friendships: [...(seed.friendships ?? [])],
    notifications: [...(seed.notifications ?? [])],
    platforms: [...(seed.platforms ?? [])],
    platformSystems: [...(seed.platformSystems ?? [])],
    genres: [...(seed.genres ?? [])],
    avatars: new Map(),
    communityThreads: [...(seed.communityThreads ?? [])],
    communityMessages: [...(seed.communityMessages ?? [])],
    communityVotes: [...(seed.communityVotes ?? [])],
    communityImages: new Map(),
    activityEvents: [...(seed.activityEvents ?? [])],
    gameEvents: [...(seed.gameEvents ?? [])],
    igdbUsage: [...(seed.igdbUsage ?? [])],
    serverErrors: [...(seed.serverErrors ?? [])],
    announcements: [],
    contentReports: [...(seed.contentReports ?? [])],
  };

  let nextLogId = 1000;
  let nextReviewId = 2000;
  let nextGameId = 3000;
  let nextNotificationId = 4000;

  // the reviews_clear_notifications trigger
  const clearReviewNotifications = (reviewId: number) => {
    state.notifications = state.notifications.filter(
      (n) => n.dedupe_key !== `review_upvotes:${reviewId}`,
    );
  };

  const withPlatforms = (game: GameRow): GameRowWithPlatforms => ({
    ...game,
    game_platforms: state.gamePlatforms
      .filter((gp) => gp.game_id === game.id)
      .map((gp) => ({ platform_slug: gp.platform_slug })),
    game_systems: state.gameSystems
      .filter((gs) => gs.game_id === game.id)
      .map((gs) => ({ system_slug: gs.system_slug })),
  });

  const withGame = (log: GameLogRow): GameLogRowWithGame => {
    const game = state.games.find((g) => g.id === log.game_id);
    return { ...log, game: game ? withPlatforms(game) : null };
  };

  const asFriendProfile = (p: ProfileRow): FriendProfileRow => ({
    id: p.id,
    username: p.username,
    avatar_url: p.avatar_url,
    accent: p.accent,
    bio: p.bio,
    last_seen_at: p.last_seen_at,
  });

  const withActor = (n: NotificationRow): NotificationRowWithActor => {
    const actor = state.profiles.find((p) => p.id === n.actor_id);
    return { ...n, actor: actor ? asFriendProfile(actor) : null };
  };

  const withUsers = (f: FriendshipRow): FriendshipWithUsers => {
    const a = state.profiles.find((p) => p.id === f.user_a_id);
    const b = state.profiles.find((p) => p.id === f.user_b_id);
    return {
      ...f,
      user_a: a ? asFriendProfile(a) : null,
      user_b: b ? asFriendProfile(b) : null,
    };
  };

  /* Mirrors the review_cards view: the review with its author and the log
     it reviews flattened onto one row. */
  const withAuthor = (r: ReviewRow): ReviewRowJoined => {
    const author = state.profiles.find((p) => p.id === r.user_id);
    const log = state.gameLogs.find((l) => l.id === r.log_id);
    const game = state.games.find((g) => g.id === r.game_id);
    return {
      ...r,
      rating: log?.rating ?? null,
      hours_played: log?.hours_played ?? null,
      status: log?.status ?? null,
      played_status: log?.played_status ?? null,
      platform_slug: log?.platform_slug ?? null,
      system_slug: log?.system_slug ?? null,
      author_username: author?.username ?? null,
      author_first_name: author?.first_name ?? null,
      vote_count: state.reviewVotes.filter((v) => v.review_id === r.id).length,
      author_avatar_url: author?.avatar_url ?? null,
      author_accent: author?.accent ?? null,
      game_has_sexual_content: game?.has_sexual_content ?? false,
      author_last_seen_at: author?.last_seen_at ?? null,
      // The view inner-joins games, so a row without one cannot exist.
      game_title: game?.title ?? "",
      game_slug: game?.slug ?? "",
      game_cover_url: game?.cover_url ?? null,
    };
  };

  /* What the real repository writes from an upstream game, links included.
     An empty description keeps the one the game had. */
  const findGame = (id: number) => state.games.find((g) => g.id === id);

  /** Logs grouped by a key, in first-seen order. */
  const groupBy = (logs: GameLogRow[], key: (l: GameLogRow) => string) => {
    const groups = new Map<string, GameLogRow[]>();
    for (const log of logs) {
      groups.set(key(log), [...(groups.get(key(log)) ?? []), log]);
    }
    return [...groups.values()];
  };
  const byPerson = (logs: GameLogRow[]) => groupBy(logs, (l) => l.user_id);
  const byGame = (logs: GameLogRow[]) =>
    groupBy(logs, (l) => `${l.user_id}:${l.game_id}`);

  /** log_rank() in SQL: the log that speaks for a person's game. */
  const headlineRow = (logs: GameLogRow[]): GameLogRow =>
    [...logs].sort(
      (a, b) =>
        logRank(a.status as GameStatus, a.played_status as PlayedStatus) -
          logRank(b.status as GameStatus, b.played_status as PlayedStatus) ||
        a.id - b.id,
    )[0]!;

  /** game_logs_user_game_system_unique, nulls not distinct. */
  const assertConsoleFree = (log: GameLogRow) => {
    const clash = state.gameLogs.some(
      (l) =>
        l.id !== log.id &&
        l.user_id === log.user_id &&
        l.game_id === log.game_id &&
        l.system_slug === log.system_slug,
    );
    if (clash) {
      throw AppError.conflict(
        "platform_taken",
        "You've already logged this game on that platform",
      );
    }
  };

  const applyExternal = (game: GameRow, external: ExternalGame) => {
    Object.assign(game, {
      igdb_id: external.externalId,
      slug: external.slug,
      title: external.title,
      ...(external.description ? { description: external.description } : {}),
      cover_url: external.coverUrl,
      box_art_url: external.boxArtUrl,
      banner_url: external.bannerUrl,
      release_date: external.releaseDate,
      has_sexual_content: external.hasSexualContent,
      developers: external.developers,
      publishers: external.publishers,
      website: external.website,
      esrb_rating: external.esrbRating,
      critic_score: external.criticScore,
      igdb_rating_count: external.igdbRatingCount,
      similar_igdb_ids: external.similarIds,
      series_id: external.series?.id ?? null,
      series_name: external.series?.name ?? null,
      alt_covers: external.altCovers,
      synced_at: now(),
    });
    state.gamePlatforms = state.gamePlatforms.filter(
      (gp) => gp.game_id !== game.id,
    );
    state.gameSystems = state.gameSystems.filter((gs) => gs.game_id !== game.id);
    for (const slug of external.platformSlugs) {
      state.gamePlatforms.push({ game_id: game.id, platform_slug: slug });
    }
    for (const slug of external.systemSlugs) {
      state.gameSystems.push({ game_id: game.id, system_slug: slug });
    }
  };

  let nextReportId = 1;
  const repos: Repositories = {
    sitemap: {
      async countGames() {
        return state.games.filter((g) => !g.has_sexual_content).length;
      },
      async games(offset, limit) {
        return state.games
          .filter((g) => !g.has_sexual_content)
          .sort((a, b) => a.id - b.id)
          .slice(offset, offset + limit)
          .map((g) => ({ id: g.id, lastmod: g.updated_at.slice(0, 10) }));
      },
      async threads() {
        return state.communityThreads.map((t) => ({
          id: t.id,
          lastmod: t.last_activity_at.slice(0, 10),
        }));
      },
    },
    reports: {
      async create(row) {
        const report: ContentReportRow = {
          ...row,
          id: nextReportId++,
          status: "open",
          created_at: new Date().toISOString(),
          resolved_at: null,
          resolved_by: null,
        };
        state.contentReports.push(report);
        return report;
      },
      async findOpen(reporterId, type, id) {
        return (
          state.contentReports.find(
            (r) =>
              r.reporter_id === reporterId &&
              r.target_type === type &&
              r.target_id === id &&
              r.status === "open",
          ) ?? null
        );
      },
      async findById(id) {
        return state.contentReports.find((r) => r.id === id) ?? null;
      },
      async list(status, from, to) {
        const matched = state.contentReports.filter((r) => r.status === status);
        return { rows: matched.slice(from, to + 1), total: matched.length };
      },
      async countOpenFor(type, id) {
        return state.contentReports.filter(
          (r) =>
            r.target_type === type && r.target_id === id && r.status === "open",
        ).length;
      },
      async closeOpenFor(type, id, status, by) {
        for (const r of state.contentReports) {
          if (r.target_type === type && r.target_id === id && r.status === "open") {
            Object.assign(r, { status, resolved_by: by, resolved_at: now() });
          }
        }
      },
      async close(id, status, by) {
        const r = state.contentReports.find((x) => x.id === id);
        if (r) Object.assign(r, { status, resolved_by: by, resolved_at: now() });
      },
    },
    accountExport: {
      async collect(userId) {
        return {
          profile: (state.profiles.find((p) => p.id === userId) ??
            null) as Record<string, unknown> | null,
          gameLogs: state.gameLogs.filter((l) => l.user_id === userId),
          reviews: state.reviews.filter((r) => r.user_id === userId),
          reviewVotes: state.reviewVotes.filter((v) => v.user_id === userId),
          friendships: state.friendships.filter(
            (f) => f.user_a_id === userId || f.user_b_id === userId,
          ),
          notifications: state.notifications.filter(
            (n) => n.user_id === userId,
          ),
          communityThreads: state.communityThreads.filter(
            (t) => t.author_id === userId,
          ),
          communityMessages: state.communityMessages.filter(
            (m) => m.author_id === userId,
          ),
          communityVotes: state.communityVotes.filter(
            (v) => v.user_id === userId,
          ),
          activeDays: [],
          reportsFiled: state.contentReports.filter(
            (r) => r.reporter_id === userId,
          ),
        };
      },
    },
    profiles: {
      async eraseTraces(id) {
        state.activityEvents = state.activityEvents.filter(
          (e) => e.actor_id !== id && e.subject_id !== id,
        );
        for (const e of state.gameEvents) {
          if (e.actor_id === id) e.actor_id = null;
        }
        for (const e of state.serverErrors) {
          if (e.user_id === id) e.user_id = null;
        }
      },
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
      async findByIgdbId(igdbId) {
        const game = state.games.find((g) => g.igdb_id === igdbId);
        return game ? withPlatforms(game) : null;
      },
      async list(query, from, to, excludeLoggedForUser, showSexualContent) {
        let rows = state.games;

        if (query.search) {
          const term = searchKey(query.search);
          rows = rows.filter((g) => searchKey(g.title).includes(term));
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
            (g) =>
              g.release_date !== null && g.release_date >= query.releasedAfter!,
          );
        }
        if (query.releasedBefore) {
          rows = rows.filter(
            (g) =>
              g.release_date !== null &&
              g.release_date <= query.releasedBefore!,
          );
        }
        // "Newest" means newest released, not newest guessed-at.
        if (query.sort === "released") {
          const today = new Date().toISOString().slice(0, 10);
          rows = rows.filter(
            (g) => g.release_date !== null && g.release_date <= today,
          );
        }

        // Mirrors the SQL sort map, tiebreaker included.
        const by = {
          title: (a: GameRow, b: GameRow) => a.title.localeCompare(b.title),
          released: (a: GameRow, b: GameRow) =>
            (b.release_date ?? "").localeCompare(a.release_date ?? ""),
          rating: (a: GameRow, b: GameRow) =>
            (b.avg_rating ?? -1) - (a.avg_rating ?? -1) ||
            b.rating_count - a.rating_count,
          critic: (a: GameRow, b: GameRow) =>
            (b.critic_score ?? -1) - (a.critic_score ?? -1),
          // IGDB's rating count is the hidden second key, not a sort.
          // The trending set keeps IGDB's order, then the usual one.
          logged: (a: GameRow, b: GameRow) =>
            (query.trending === true
              ? (a.trending_rank ?? Infinity) - (b.trending_rank ?? Infinity)
              : 0) ||
            b.log_count - a.log_count ||
            (b.igdb_rating_count ?? 0) - (a.igdb_rating_count ?? 0),
        } as const;
        const compare = by[query.sort ?? "logged"];
        const sorted = [...rows].sort((a, b) => compare(a, b) || a.id - b.id);
        return {
          rows: sorted.slice(from, to + 1).map(withPlatforms),
          total: sorted.length,
        };
      },
      async searchLocal(term, limit, showSexualContent) {
        return state.games
          .filter((g) => searchKey(g.title).includes(searchKey(term)))
          .filter((g) => showSexualContent || !g.has_sexual_content)
          .slice(0, limit)
          .map(withPlatforms);
      },
      async upsertMany(games) {
        const ids: number[] = [];
        for (const external of games) {
          const found = state.games.find(
            (g) => g.igdb_id === external.externalId,
          );
          let existing: GameRow;
          if (!found) {
            existing = {
              id: nextGameId++,
              igdb_id: external.externalId,
              slug: external.slug,
              title: external.title,
              description: "",
              cover_url: null,
              box_art_url: null,
              banner_url: null,
              release_date: null,
              has_sexual_content: false,
              developers: [],
              publishers: [],
              website: null,
              esrb_rating: null,
              is_trending: false,
              trending_rank: null,
              critic_score: null,
              igdb_rating_count: null,
              similar_igdb_ids: [],
              series_id: null,
              series_name: null,
              alt_covers: [],
              log_count: 0,
              avg_rating: null,
              rating_count: 0,
              synced_at: now(),
              created_at: now(),
              updated_at: now(),
            };
            state.games.push(existing);
          } else {
            existing = found;
          }
          applyExternal(existing, external);
          ids.push(existing.id);
        }
        return ids;
      },
      async listSeries(seriesId, exceptId, limit, showSexualContent) {
        return state.games
          .filter((g) => g.series_id === seriesId && g.id !== exceptId)
          .filter((g) => showSexualContent || !g.has_sexual_content)
          .sort(
            (a, b) =>
              (b.igdb_rating_count ?? -1) - (a.igdb_rating_count ?? -1) ||
              (b.release_date ?? "").localeCompare(a.release_date ?? "") ||
              a.id - b.id,
          )
          .slice(0, limit)
          .map(withPlatforms);
      },
      async listByDeveloper(developer, exceptIds, limit, showSexualContent) {
        return state.games
          .filter((g) => g.developers.includes(developer) && !exceptIds.includes(g.id))
          .filter((g) => showSexualContent || !g.has_sexual_content)
          .sort(
            (a, b) =>
              (b.igdb_rating_count ?? -1) - (a.igdb_rating_count ?? -1) || a.id - b.id,
          )
          .slice(0, limit)
          .map(withPlatforms);
      },
      async listByIgdbIds(igdbIds, showSexualContent) {
        return igdbIds
          .map((id) => state.games.find((g) => g.igdb_id === id))
          .filter((g): g is GameRow => !!g)
          .filter((g) => showSexualContent || !g.has_sexual_content)
          .map(withPlatforms);
      },
      async existingIgdbIds(igdbIds) {
        return state.games
          .map((g) => g.igdb_id)
          .filter((id): id is number => id !== null && igdbIds.includes(id));
      },
      async setTrending(id, isTrending) {
        const game = state.games.find((g) => g.id === id);
        if (game) game.is_trending = isTrending;
      },
      async replaceTrending(ids) {
        for (const g of state.games) {
          const rank = ids.indexOf(g.id);
          g.is_trending = rank !== -1;
          g.trending_rank = rank === -1 ? null : rank + 1;
        }
      },
      async applyExternal(id, external) {
        const game = state.games.find((g) => g.id === id);
        if (game) applyExternal(game, external);
      },
      /* The SQL counts each person once: their hours summed across
         consoles, their quickest time to beat, their best completion. */
      async playratesStats(gameId) {
        const people = byPerson(
          state.gameLogs.filter((l) => l.game_id === gameId),
        );
        const mean = (values: (number | null)[]) => {
          const present = values.filter((v): v is number => v !== null);
          if (present.length === 0) return null;
          return (
            Math.round(
              (present.reduce((a, b) => a + b, 0) / present.length) * 10,
            ) / 10
          );
        };
        const present = (values: (number | null)[]) =>
          values.filter((v): v is number => v !== null);
        // Clamped per log, like the SQL: completed is not constrained to total.
        const completions = people
          .map((logs) =>
            present(
              logs.map((l) =>
                (l.achievements_total ?? 0) > 0
                  ? Math.min(
                      1,
                      (l.achievements_completed ?? 0) /
                        (l.achievements_total ?? 1),
                    )
                  : null,
              ),
            ),
          )
          .filter((c) => c.length > 0)
          .map((c) => Math.max(...c));
        return {
          avgHoursPlayed: mean(
            people.map((logs) => {
              const hours = present(logs.map((l) => l.hours_played));
              return hours.length ? hours.reduce((a, b) => a + b, 0) : null;
            }),
          ),
          avgHoursToBeat: mean(
            people.map((logs) => {
              const hours = present(logs.map((l) => l.hours_to_beat));
              return hours.length ? Math.min(...hours) : null;
            }),
          ),
          avgCompletion:
            completions.length === 0
              ? null
              : completions.reduce((a, b) => a + b, 0) / completions.length,
          achievementTrackedCount: completions.length,
        };
      },

      /* One bucket per person, by the log that speaks for the game. */
      async statusCounts(gameId) {
        const byStatus: Record<string, number> = {
          played: 0,
          playing: 0,
          backlog: 0,
          wishlist: 0,
        };
        const byPlayedStatus: Record<string, number> = {
          finished: 0,
          mastered: 0,
          shelved: 0,
          retired: 0,
        };

        for (const logs of byPerson(
          state.gameLogs.filter((l) => l.game_id === gameId),
        )) {
          const log = headlineRow(logs);
          byStatus[log.status] = (byStatus[log.status] ?? 0) + 1;
          if (log.status === "played" && log.played_status) {
            byPlayedStatus[log.played_status] =
              (byPlayedStatus[log.played_status] ?? 0) + 1;
          }
        }
        return { byStatus, byPlayedStatus };
      },
      async ratingSummary(gameId) {
        const ratings = byPerson(
          state.gameLogs.filter(
            (l) => l.game_id === gameId && l.rating !== null,
          ),
        ).map(
          (logs) =>
            logs.reduce((a, l) => a + Number(l.rating), 0) / logs.length,
        );
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
      async listByUser(userId, query, from, to) {
        const rows = state.gameLogs.filter((l) => {
          if (l.user_id !== userId) return false;
          if (query.status && l.status !== query.status) return false;
          if (query.playedStatus === "none") return l.played_status === null;
          if (query.playedStatus) return l.played_status === query.playedStatus;
          return true;
        });

        /* Derived rather than read off the row, which is what the generated
           column in the database holds. */
        const completion = (l: GameLogRow) =>
          l.achievements_total
            ? (l.achievements_completed ?? 0) / l.achievements_total
            : null;

        const sortKey = (l: GameLogRow): string | number | null => {
          const game = state.games.find((g) => g.id === l.game_id);
          switch (query.sort) {
            case "rating":
              return l.rating;
            case "gameRating":
              return game?.avg_rating ?? null;
            case "critic":
              return game?.critic_score ?? null;
            case "played":
              // Mirrors greatest(start_date, finish_date) in the database.
              return (
                [l.start_date, l.finish_date]
                  .filter((d): d is string => !!d)
                  .sort()
                  .at(-1) ?? null
              );
            case "title":
              return game?.title ?? null;
            case "released":
              return game?.release_date ?? null;
            case "completion":
              return completion(l);
          }
        };

        const sorted = [...rows].sort((a, b) => {
          const x = sortKey(a);
          const y = sortKey(b);
          // Nothing to sort on goes last whichever way the rest is facing.
          if (x === null && y === null) return b.id - a.id;
          if (x === null) return 1;
          if (y === null) return -1;
          if (x === y) return b.id - a.id;
          const ahead = x < y ? -1 : 1;
          return query.direction === "asc" ? ahead : -ahead;
        });

        return {
          rows: sorted.slice(from, to + 1).map(withGame),
          total: sorted.length,
        };
      },
      async shelfByUser(userId, query, from, to) {
        const games = byGame(state.gameLogs.filter((l) => l.user_id === userId))
          .filter((logs) => {
            if (query.status && !logs.some((l) => l.status === query.status)) {
              return false;
            }
            if (!query.playedStatus) return true;
            return logs.some(
              (l) =>
                l.status === "played" &&
                (l.played_status ?? "none") === query.playedStatus,
            );
          })
          .map((logs) => ({ logs, game: findGame(logs[0]!.game_id) }));

        const sortKey = ({
          logs,
          game,
        }: (typeof games)[number]): string | number | null => {
          const present = <T,>(values: (T | null)[]) =>
            values.filter((v): v is T => v !== null);
          switch (query.sort) {
            case "rating": {
              const rated = present(logs.map((l) => l.rating)).map(Number);
              return rated.length
                ? rated.reduce((a, b) => a + b, 0) / rated.length
                : null;
            }
            case "gameRating":
              return game?.avg_rating ?? null;
            case "critic":
              return game?.critic_score ?? null;
            case "played":
              return (
                present(logs.flatMap((l) => [l.start_date, l.finish_date]))
                  .sort()
                  .at(-1) ?? null
              );
            case "title":
              return game?.title ?? null;
            case "released":
              return game?.release_date ?? null;
            case "completion": {
              const done = present(
                logs.map((l) =>
                  l.achievements_total
                    ? (l.achievements_completed ?? 0) / l.achievements_total
                    : null,
                ),
              );
              return done.length ? Math.max(...done) : null;
            }
          }
        };
        const latest = (g: (typeof games)[number]) =>
          Math.max(...g.logs.map((l) => l.id));

        const sorted = [...games].sort((a, b) => {
          const x = sortKey(a);
          const y = sortKey(b);
          if (x === null && y === null) return latest(b) - latest(a);
          if (x === null) return 1;
          if (y === null) return -1;
          if (x === y) return latest(b) - latest(a);
          const ahead = x < y ? -1 : 1;
          return query.direction === "asc" ? ahead : -ahead;
        });

        return {
          gameIds: sorted.slice(from, to + 1).map((g) => g.logs[0]!.game_id),
          total: sorted.length,
        };
      },
      async findOwn(userId, logId) {
        const log = state.gameLogs.find(
          (l) => l.id === logId && l.user_id === userId,
        );
        return log ? withGame(log) : null;
      },
      async listByUserAndGame(userId, gameId) {
        return this.listByUserAndGames(userId, [gameId]);
      },
      async listByUserAndGames(userId, gameIds) {
        return state.gameLogs
          .filter((l) => l.user_id === userId && gameIds.includes(l.game_id))
          .sort(
            (a, b) =>
              a.created_at.localeCompare(b.created_at) || a.id - b.id,
          )
          .map(withGame);
      },
      async create(userId, gameId, patch) {
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
          system_slug: null,
          completion: null,
          last_played: null,
          platform_slug: null,
          achievements_total: null,
          achievements_completed: null,
          created_at: now(),
          updated_at: now(),
          ...patch,
        };
        assertConsoleFree(row);
        state.gameLogs.push(row);
        return withGame(row);
      },
      async update(id, patch) {
        const log = state.gameLogs.find((l) => l.id === id);
        if (!log) throw new Error("game log not found");
        assertConsoleFree({ ...log, ...patch });
        Object.assign(log, patch, { updated_at: now() });
        return withGame(log);
      },
      async remove(id) {
        state.gameLogs = state.gameLogs.filter((l) => l.id !== id);
        // reviews_log_fk cascades
        for (const r of state.reviews) {
          if (r.log_id === id) clearReviewNotifications(r.id);
        }
        state.reviews = state.reviews.filter((r) => r.log_id !== id);
      },
      async count() {
        return state.gameLogs.length;
      },
      async summariesByUser(userId) {
        return state.gameLogs
          .filter((l) => l.user_id === userId)
          .map((l) => ({
            id: l.id,
            game_id: l.game_id,
            system_slug: l.system_slug,
            status: l.status,
            played_status: l.played_status,
            rating: l.rating,
          }));
      },
      /* Mirrors user_log_stats(): shelf counts are games, with a game on
         every shelf one of its logs is on; the rating is over games. */
      async statsByUser(userId, year) {
        const rows = state.gameLogs.filter(
          (l) =>
            l.user_id === userId &&
            (year === undefined ||
              new Date(l.updated_at).getUTCFullYear() === year),
        );
        const games = byGame(rows);

        const byStatus: Record<string, number> = {
          played: 0,
          playing: 0,
          backlog: 0,
          wishlist: 0,
        };
        for (const logs of games) {
          for (const status of new Set(logs.map((l) => l.status))) {
            byStatus[status] = (byStatus[status] ?? 0) + 1;
          }
        }
        const hoursPlayed = rows.reduce(
          (sum, l) => sum + Number(l.hours_played ?? 0),
          0,
        );
        const means = games
          .map((logs) => logs.filter((l) => l.rating !== null))
          .filter((rated) => rated.length > 0)
          .map(
            (rated) =>
              rated.reduce((a, l) => a + Number(l.rating), 0) / rated.length,
          );

        return {
          logCount: rows.length,
          gameCount: games.length,
          byStatus,
          hoursPlayed: Math.round(hoursPlayed * 10) / 10,
          averageRating:
            means.length === 0
              ? null
              : Math.round(
                  (means.reduce((a, b) => a + b, 0) / means.length) * 100,
                ) / 100,
          ratingCount: means.length,
        };
      },
    },

    reviews: {
      async findById(id) {
        const row = state.reviews.find((r) => r.id === id);
        return row ? withAuthor(row) : null;
      },

      async votedReviewIds(userId, reviewIds) {
        return new Set(
          state.reviewVotes
            .filter(
              (v) => v.user_id === userId && reviewIds.includes(v.review_id),
            )
            .map((v) => v.review_id),
        );
      },

      async hasVoted(userId, reviewId) {
        return state.reviewVotes.some(
          (v) => v.user_id === userId && v.review_id === reviewId,
        );
      },

      async addVote(userId, reviewId) {
        // Primary key is (review_id, user_id), so a second vote is a no-op.
        const exists = state.reviewVotes.some(
          (v) => v.user_id === userId && v.review_id === reviewId,
        );
        if (!exists) {
          state.reviewVotes.push({ review_id: reviewId, user_id: userId });
        }
      },

      async removeVote(userId, reviewId) {
        state.reviewVotes = state.reviewVotes.filter(
          (v) => !(v.user_id === userId && v.review_id === reviewId),
        );
      },

      async voteCount(reviewId) {
        return state.reviewVotes.filter((v) => v.review_id === reviewId).length;
      },

      async listRecent(from, to, showSexualContent) {
        const explicit = new Set(
          state.games.filter((g) => g.has_sexual_content).map((g) => g.id),
        );
        const rows = state.reviews
          .filter((r) => r.is_public)
          .filter((r) => showSexualContent || !explicit.has(r.game_id))
          .sort(
            (a, b) =>
              Date.parse(b.created_at) - Date.parse(a.created_at) ||
              b.id - a.id,
          );
        return {
          rows: rows.slice(from, to + 1).map(withAuthor),
          total: rows.length,
        };
      },

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
        const review = state.reviews
          .filter((r) => r.user_id === userId && r.game_id === gameId)
          .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
        return review ? withAuthor(review) : null;
      },
      async findByLog(logId) {
        const review = state.reviews.find((r) => r.log_id === logId);
        return review ? withAuthor(review) : null;
      },
      async listByLogs(logIds) {
        return state.reviews
          .filter((r) => logIds.includes(r.log_id))
          .map(withAuthor);
      },
      async upsertForLog(userId, gameId, logId, patch) {
        const existing = state.reviews.find((r) => r.log_id === logId);
        if (existing) {
          Object.assign(existing, patch, { updated_at: now() });
          return { row: withAuthor(existing), created: false };
        }
        const row: ReviewRow = {
          id: nextReviewId++,
          user_id: userId,
          game_id: gameId,
          log_id: logId,
          created_at: now(),
          updated_at: now(),
          ...patch,
        };
        state.reviews.push(row);
        return { row: withAuthor(row), created: true };
      },
      async remove(id) {
        state.reviews = state.reviews.filter((r) => r.id !== id);
        clearReviewNotifications(id);
      },
    },

    friends: {
      async activityFor(viewerId, from, to, showSexualContent) {
        const friendIds = new Set(
          state.friendships
            .filter(
              (f) =>
                f.status === "accepted" &&
                (f.user_a_id === viewerId || f.user_b_id === viewerId),
            )
            .map((f) => (f.user_a_id === viewerId ? f.user_b_id : f.user_a_id)),
        );

        const rows = state.gameLogs
          .filter((l) => friendIds.has(l.user_id))
          .sort(
            (a, b) =>
              Date.parse(b.updated_at) - Date.parse(a.updated_at) ||
              b.id - a.id,
          )
          .map((l) => {
            const actor = state.profiles.find((p) => p.id === l.user_id);
            const game = state.games.find((g) => g.id === l.game_id);
            return {
              log_id: l.id,
              user_id: l.user_id,
              game_id: l.game_id,
              status: l.status,
              played_status: l.played_status,
              rating: l.rating,
              hours_played: l.hours_played,
              updated_at: l.updated_at,
              actor_username: actor?.username ?? "",
              actor_avatar_url: actor?.avatar_url ?? null,
              actor_accent: actor?.accent ?? null,
              game_has_sexual_content: game?.has_sexual_content ?? false,
              actor_last_seen_at: actor?.last_seen_at ?? "",
              game_title: game?.title ?? "",
              game_cover_url: game?.cover_url ?? null,
              system_slug: l.system_slug,
            };
          })
          .filter((row) => showSexualContent || !row.game_has_sexual_content);

        return { rows: rows.slice(from, to + 1), total: rows.length };
      },

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

    notifications: {
      async listForUser(userId, archived, from, to) {
        const rows = state.notifications
          .filter(
            (n) =>
              n.user_id === userId && archived === (n.archived_at !== null),
          )
          .sort(
            (a, b) =>
              Date.parse(b.created_at) - Date.parse(a.created_at) ||
              b.id - a.id,
          )
          .map(withActor);
        return { rows: rows.slice(from, to + 1), total: rows.length };
      },
      async countUnread(userId) {
        return state.notifications.filter(
          (n) =>
            n.user_id === userId &&
            n.read_at === null &&
            n.archived_at === null,
        ).length;
      },
      async findById(id) {
        return state.notifications.find((n) => n.id === id) ?? null;
      },
      async update(id, patch) {
        const row = state.notifications.find((n) => n.id === id);
        if (!row) throw new Error("notification not found");
        Object.assign(row, patch);
        return withActor(row);
      },
      async raise({
        userId,
        kind,
        actorId = null,
        data = {},
        dedupeKey = null,
      }) {
        const existing =
          dedupeKey === null
            ? undefined
            : state.notifications.find(
                (n) => n.user_id === userId && n.dedupe_key === dedupeKey,
              );

        if (existing) {
          Object.assign(existing, {
            actor_id: actorId,
            data,
            read_at: null,
            archived_at: null,
            created_at: now(),
          });
          return;
        }

        state.notifications.push({
          id: nextNotificationId++,
          user_id: userId,
          kind,
          actor_id: actorId,
          data,
          dedupe_key: dedupeKey,
          read_at: null,
          archived_at: null,
          created_at: now(),
        });
      },
      async bumpThreadActivity(userId, dedupeKey, data) {
        const existing = state.notifications.find(
          (n) => n.user_id === userId && n.dedupe_key === dedupeKey,
        );
        if (!existing) {
          state.notifications.push({
            id: nextNotificationId++,
            user_id: userId,
            kind: "community_thread_activity",
            actor_id: null,
            data: { ...data, count: 1 },
            dedupe_key: dedupeKey,
            read_at: null,
            archived_at: null,
            created_at: new Date().toISOString(),
          });
          return;
        }
        const unread = !existing.read_at && !existing.archived_at;
        Object.assign(existing, {
          data: {
            ...data,
            count: unread ? Number(existing.data.count ?? 0) + 1 : 1,
          },
          read_at: null,
          archived_at: null,
          created_at: new Date().toISOString(),
        });
      },
      async raiseMilestone(userId, kind, dedupeKey, milestone, data) {
        const existing = state.notifications.find(
          (n) => n.user_id === userId && n.dedupe_key === dedupeKey,
        );
        if (existing) {
          if (Number(existing.data.milestone ?? 0) >= milestone) return;
          Object.assign(existing, {
            data: { ...data, milestone },
            read_at: null,
            archived_at: null,
            created_at: new Date().toISOString(),
          });
          return;
        }
        state.notifications.push({
          id: nextNotificationId++,
          user_id: userId,
          kind,
          actor_id: null,
          data: { ...data, milestone },
          dedupe_key: dedupeKey,
          read_at: null,
          archived_at: null,
          created_at: new Date().toISOString(),
        });
      },
      async removeByKey(dedupeKey) {
        state.notifications = state.notifications.filter(
          (n) => n.dedupe_key !== dedupeKey,
        );
      },
      async markAllRead(userId) {
        for (const n of state.notifications) {
          if (n.user_id === userId && n.archived_at === null) {
            n.read_at ??= now();
          }
        }
      },
      async markReadByKey(userId, dedupeKey) {
        for (const n of state.notifications) {
          if (n.user_id === userId && n.dedupe_key === dedupeKey) {
            n.read_at ??= now();
          }
        }
      },
    },

    platforms: {
      async list() {
        return [...state.platforms].sort((a, b) => a.sort_order - b.sort_order);
      },
      async listSystems() {
        return [...state.platformSystems].sort(
          (a, b) => a.sort_order - b.sort_order,
        );
      },
    },

    community: createInMemoryCommunity(state),
    gameEvents: createInMemoryGameEvents(state),
    admin: createInMemoryAdmin(state),

    genres: {
      async list() {
        return [...state.genres].sort((a, b) => a.name.localeCompare(b.name));
      },
    },
  };

  /* Emulates what Postgres does on delete. Every FK pointing at profiles is
     ON DELETE CASCADE, so removing the user takes their logs, reviews and
     friendships with it — a fake that only dropped the profile would let a
     broken cascade pass the tests. */
  const authAdmin: AuthAdmin = {
    async getEmail(userId) {
      return state.profiles.some((p) => p.id === userId)
        ? `${userId}@example.test`
        : null;
    },
    async deleteUser(userId) {
      state.profiles = state.profiles.filter((p) => p.id !== userId);
      state.gameLogs = state.gameLogs.filter((l) => l.user_id !== userId);
      state.reviews = state.reviews.filter((r) => r.user_id !== userId);
      state.friendships = state.friendships.filter(
        (f) => f.user_a_id !== userId && f.user_b_id !== userId,
      );
      state.notifications = state.notifications.filter(
        (n) => n.user_id !== userId && n.actor_id !== userId,
      );
      // Community authorship is SET NULL, so the conversation outlives them.
      for (const t of state.communityThreads) {
        if (t.author_id === userId) t.author_id = null;
      }
      for (const m of state.communityMessages) {
        if (m.author_id === userId) m.author_id = null;
      }
      state.communityVotes = state.communityVotes.filter(
        (v) => v.user_id !== userId,
      );
    },
  };

  /* Records what was stored so a test can assert the bytes reached it, and
     hands back a URL shaped like the real one. */
  const avatars: AvatarStore = {
    async put(userId, bytes) {
      state.avatars.set(userId, bytes);
      return `https://test.supabase.co/storage/v1/object/public/avatars/${userId}/avatar.webp?v=1`;
    },
    async remove(userId) {
      state.avatars.delete(userId);
    },
  };

  const IMAGE_PREFIX =
    "https://test.supabase.co/storage/v1/object/public/community-images/";
  let nextImage = 1;
  const communityImages: CommunityImageStore = {
    async put(userId, bytes) {
      const url = `${IMAGE_PREFIX}${userId}/${nextImage++}.webp`;
      state.communityImages.set(url, {
        bytes,
        createdAt: new Date().toISOString(),
      });
      return url;
    },
    owns(url) {
      return isStoredImageUrl(IMAGE_PREFIX, url);
    },
    async listUploads(userId) {
      return [...state.communityImages.entries()]
        .filter(([url]) => url.startsWith(`${IMAGE_PREFIX}${userId}/`))
        .map(([url, { createdAt }]) => ({ url, createdAt }));
    },
    async remove(urls) {
      for (const url of urls) state.communityImages.delete(url);
    },
  };

  return { repos, state, authAdmin, avatars, communityImages };
};

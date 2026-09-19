import type { GameQuery } from "@playrates/shared";
import type { Db } from "../../config/supabase.js";
import type { ExternalGame } from "../../providers/games/GamesProvider.js";
import type { GameRowWithPlatforms } from "./games.mapper.js";

const SELECT_WITH_PLATFORMS = "*, game_platforms(platform_slug)";

export interface GameStatsRow {
    status: string;
    count: number;
}

export interface GamesRepository {
    findById(id: number): Promise<GameRowWithPlatforms | null>;
    findByRawgId(rawgId: number): Promise<GameRowWithPlatforms | null>;
    list(
        query: GameQuery,
        from: number,
        to: number,
        excludeLoggedForUser?: string
    ): Promise<{ rows: GameRowWithPlatforms[]; total: number }>;
    searchLocal(term: string, limit: number): Promise<GameRowWithPlatforms[]>;
    upsertMany(games: ExternalGame[]): Promise<number[]>;
    statusCounts(gameId: number): Promise<Record<string, number>>;
    ratingSummary(
        gameId: number
    ): Promise<{ average: number | null; count: number }>;
    count(): Promise<number>;
}

export const createGamesRepository = (db: Db): GamesRepository => ({
    async findById(id) {
        const { data, error } = await db
            .from("games")
            .select(SELECT_WITH_PLATFORMS)
            .eq("id", id)
            .maybeSingle();
        if (error) throw error;
        return (data as GameRowWithPlatforms | null) ?? null;
    },

    async findByRawgId(rawgId) {
        const { data, error } = await db
            .from("games")
            .select(SELECT_WITH_PLATFORMS)
            .eq("rawg_id", rawgId)
            .maybeSingle();
        if (error) throw error;
        return (data as GameRowWithPlatforms | null) ?? null;
    },

    async list(query, from, to, excludeLoggedForUser) {
        let builder = db
            .from("games")
            .select(SELECT_WITH_PLATFORMS, { count: "exact" });

        if (query.search) builder = builder.ilike("title", `%${query.search}%`);
        if (query.trending !== undefined) {
            builder = builder.eq("is_trending", query.trending);
        }
        if (!query.includeAdult) builder = builder.eq("is_adult", false);

        // filtering by platform needs the join table, so restrict by id
        if (query.platform) {
            const { data: ids, error: idError } = await db
                .from("game_platforms")
                .select("game_id")
                .eq("platform_slug", query.platform);
            if (idError) throw idError;
            builder = builder.in(
                "id",
                (ids ?? []).map((r) => (r as { game_id: number }).game_id)
            );
        }

        // "hide games I have already logged" — was a client-side filter over
        // the whole catalogue
        if (excludeLoggedForUser) {
            const { data: logged, error: logError } = await db
                .from("game_logs")
                .select("game_id")
                .eq("user_id", excludeLoggedForUser);
            if (logError) throw logError;
            const loggedIds = (logged ?? []).map(
                (r) => (r as { game_id: number }).game_id
            );
            if (loggedIds.length > 0) {
                builder = builder.not(
                    "id",
                    "in",
                    `(${loggedIds.join(",")})`
                );
            }
        }

        const { data, error, count } = await builder
            .order("title")
            .range(from, to);
        if (error) throw error;
        return { rows: (data ?? []) as GameRowWithPlatforms[], total: count ?? 0 };
    },

    async searchLocal(term, limit) {
        const { data, error } = await db
            .from("games")
            .select(SELECT_WITH_PLATFORMS)
            .ilike("title", `%${term}%`)
            .order("popularity", { ascending: false, nullsFirst: false })
            .limit(limit);
        if (error) throw error;
        return (data ?? []) as GameRowWithPlatforms[];
    },

    async upsertMany(games) {
        if (games.length === 0) return [];

        const rows = games.map((g) => ({
            rawg_id: g.externalId,
            slug: g.slug,
            title: g.title,
            description: g.description,
            cover_url: g.coverUrl,
            release_date: g.releaseDate,
            is_adult: g.isAdult,
            popularity: g.popularity,
            hours_to_beat: g.hoursToBeat,
            raw: g.raw,
            synced_at: new Date().toISOString(),
        }));

        const { data, error } = await db
            .from("games")
            .upsert(rows, { onConflict: "rawg_id", ignoreDuplicates: false })
            .select("id, rawg_id");
        if (error) throw error;

        const saved = (data ?? []) as { id: number; rawg_id: number }[];
        const idByRawgId = new Map(saved.map((r) => [r.rawg_id, r.id]));

        // replace the platform links rather than accumulating duplicates
        const gameIds = saved.map((r) => r.id);
        if (gameIds.length > 0) {
            const { error: deleteError } = await db
                .from("game_platforms")
                .delete()
                .in("game_id", gameIds);
            if (deleteError) throw deleteError;
        }

        const links = games.flatMap((g) => {
            const gameId = idByRawgId.get(g.externalId);
            if (!gameId) return [];
            return g.platformSlugs.map((slug) => ({
                game_id: gameId,
                platform_slug: slug,
            }));
        });

        if (links.length > 0) {
            const { error: linkError } = await db
                .from("game_platforms")
                .insert(links);
            if (linkError) throw linkError;
        }

        return gameIds;
    },

    async statusCounts(gameId) {
        const { data, error } = await db
            .from("game_logs")
            .select("status")
            .eq("game_id", gameId);
        if (error) throw error;

        const counts: Record<string, number> = {
            played: 0,
            playing: 0,
            backlog: 0,
            wishlist: 0,
        };
        for (const row of (data ?? []) as { status: string }[]) {
            counts[row.status] = (counts[row.status] ?? 0) + 1;
        }
        return counts;
    },

    async ratingSummary(gameId) {
        const { data, error } = await db
            .from("game_logs")
            .select("rating")
            .eq("game_id", gameId)
            .not("rating", "is", null);
        if (error) throw error;

        const ratings = (data ?? [])
            .map((r) => (r as { rating: number | null }).rating)
            .filter((r): r is number => r !== null);

        if (ratings.length === 0) return { average: null, count: 0 };

        const sum = ratings.reduce((acc, r) => acc + Number(r), 0);
        return {
            average: Math.round((sum / ratings.length) * 100) / 100,
            count: ratings.length,
        };
    },

    async count() {
        const { count, error } = await db
            .from("games")
            .select("id", { count: "exact", head: true });
        if (error) throw error;
        return count ?? 0;
    },
});

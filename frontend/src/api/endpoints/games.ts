import type {
    Game,
    GameSort,
    GameStats,
    Genre,
    Paginated,
    Platform,
} from "@playrates/shared";
import { api } from "../client";

export interface GameListFilters {
    search?: string;
    platform?: string;
    genre?: string;
    trending?: boolean;
    excludeLogged?: boolean;
    sort?: GameSort;
    releasedAfter?: string;
    releasedBefore?: string;
    page?: number;
    limit?: number;
}

/**
 * Drops empty values before they reach the wire. An empty string fails the
 * slug patterns with a 422, which is exactly what happens the moment someone
 * re-selects "All platforms" after picking one.
 */
export const compactParams = <T extends object>(params: T): Partial<T> =>
    Object.fromEntries(
        Object.entries(params).filter(
            ([, value]) => value !== undefined && value !== null && value !== ""
        )
    ) as Partial<T>;

export const fetchGames = async (
    filters: GameListFilters = {}
): Promise<Paginated<Game>> => {
    const { data } = await api.get<Paginated<Game>>("/games", {
        params: compactParams(filters),
    });
    return data;
};

export const fetchGameById = async (id: number): Promise<Game> => {
    const { data } = await api.get<Game>(`/games/${id}`);
    return data;
};

export const fetchGameStats = async (id: number): Promise<GameStats> => {
    const { data } = await api.get<GameStats>(`/games/${id}/stats`);
    return data;
};

export const searchGames = async (
    q: string,
    limit = 25
): Promise<Paginated<Game>> => {
    const { data } = await api.get<Paginated<Game>>("/games/search", {
        params: { q, limit },
    });
    return data;
};

export const fetchPlatforms = async (): Promise<Platform[]> => {
    const { data } = await api.get<{ data: Platform[] }>("/platforms");
    return data.data;
};

/** A game carries genre slugs only, so display names come from here. */
export const fetchGenres = async (): Promise<Genre[]> => {
    const { data } = await api.get<{ data: Genre[] }>("/genres");
    return data.data;
};

export interface SiteStats {
    userCount: number;
    gameCount: number;
    logCount: number;
}

/** Totals for the home page, counted server-side. */
export const fetchSiteStats = async (): Promise<SiteStats> => {
    const { data } = await api.get<SiteStats>("/stats");
    return data;
};

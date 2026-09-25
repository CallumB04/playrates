import type {
    Game,
    GameSort,
    GameStats,
    Genre,
    Paginated,
    Platform,
    PlatformSystem,
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

/** Drops empty values: an empty slug fails validation with a 422, which is
 *  what re-selecting "All platforms" would otherwise send. */
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

/** The machines within those families, for the log editor. */
export const fetchPlatformSystems = async (): Promise<PlatformSystem[]> => {
    const { data } = await api.get<{ data: PlatformSystem[] }>(
        "/platforms/systems"
    );
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

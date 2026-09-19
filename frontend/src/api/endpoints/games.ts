import type { Game, GameStats, Paginated, Platform } from "@playrates/shared";
import { api } from "../client";

export interface GameListFilters {
    search?: string;
    platform?: string;
    trending?: boolean;
    includeAdult?: boolean;
    excludeLogged?: boolean;
    page?: number;
    limit?: number;
}

export const fetchGames = async (
    filters: GameListFilters = {}
): Promise<Paginated<Game>> => {
    const { data } = await api.get<Paginated<Game>>("/games", {
        params: filters,
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

export interface SiteStats {
    userCount: number;
    gameCount: number;
    logCount: number;
}

/**
 * Replaces the home page fetching every user, every game and every game log
 * in order to render three numbers.
 */
export const fetchSiteStats = async (): Promise<SiteStats> => {
    const { data } = await api.get<SiteStats>("/stats");
    return data;
};

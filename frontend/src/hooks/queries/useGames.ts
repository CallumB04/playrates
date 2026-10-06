import {
    keepPreviousData,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import type { Game } from "@playrates/shared";
import {
    fetchGameById,
    fetchGames,
    fetchGameRelated,
    fetchGameStats,
    fetchGenres,
    fetchPlatforms,
    fetchPlatformSystems,
    fetchSiteStats,
    queryKeys,
    type GameListFilters,
} from "../../api";

export const useGames = (filters: GameListFilters = {}) =>
    useQuery({
        queryKey: queryKeys.games.list({ ...filters }),
        queryFn: () => fetchGames(filters),
        staleTime: 5 * 60_000,
        // Hold the previous page while the next loads, or the grid blanks.
        placeholderData: keepPreviousData,
    });

export const useGame = (id: number | undefined) =>
    useQuery<Game>({
        queryKey: queryKeys.games.byId(id ?? 0),
        queryFn: () => fetchGameById(id!),
        enabled: typeof id === "number" && id > 0,
        staleTime: 5 * 60_000,
    });

/** Loads a game ahead of the click, so its page opens with it already in
 *  hand. Same key and freshness as useGame, so the page just reads it. */
export const usePrefetchGame = () => {
    const queryClient = useQueryClient();
    return (id: number) =>
        queryClient.prefetchQuery({
            queryKey: queryKeys.games.byId(id),
            queryFn: () => fetchGameById(id),
            staleTime: 5 * 60_000,
        });
};

export const useGameStats = (id: number | undefined) =>
    useQuery({
        queryKey: queryKeys.games.stats(id ?? 0),
        queryFn: () => fetchGameStats(id!),
        enabled: typeof id === "number" && id > 0,
    });

/** Not urgent: it sits below everything else on the page, and changes only
 *  when the catalogue does. */
export const useGameRelated = (id: number | undefined) =>
    useQuery({
        queryKey: queryKeys.games.related(id ?? 0),
        queryFn: () => fetchGameRelated(id!),
        enabled: typeof id === "number" && id > 0,
        staleTime: 30 * 60_000,
    });

export const usePlatforms = () =>
    useQuery({
        queryKey: queryKeys.platforms,
        queryFn: fetchPlatforms,
        staleTime: Infinity, // reference data
    });

export const usePlatformSystems = () =>
    useQuery({
        queryKey: queryKeys.platformSystems,
        queryFn: fetchPlatformSystems,
        staleTime: Infinity, // reference data
    });

export const useGenres = () =>
    useQuery({
        queryKey: queryKeys.genres,
        queryFn: fetchGenres,
        staleTime: Infinity, // reference data
    });

export const useSiteStats = () =>
    useQuery({
        queryKey: queryKeys.stats,
        queryFn: fetchSiteStats,
        staleTime: 60_000,
    });

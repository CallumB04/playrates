import { useEffect, useRef } from "react";
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
    searchGames,
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

/**
 * When the library's search comes back empty, the search the masthead uses:
 * it reaches IGDB and adds what it finds to the catalogue. The library's own
 * list is then fetched again, so the new games turn up in the grid with its
 * filters still applied. Signed in only, like the endpoint.
 */
export const useCatalogueReach = (term: string, enabled: boolean) => {
    const queryClient = useQueryClient();
    const { data, isFetching } = useQuery({
        queryKey: queryKeys.games.reach(term),
        queryFn: () => searchGames(term),
        enabled: enabled && term.length >= 2,
        staleTime: 5 * 60_000,
    });

    // Once per term: the list coming back empty again must not loop.
    const refreshedFor = useRef<string | null>(null);
    const found = data?.data.length ?? 0;
    useEffect(() => {
        if (!found || refreshedFor.current === term) return;
        refreshedFor.current = term;
        void queryClient.invalidateQueries({
            queryKey: ["games", "list"],
        });
    }, [found, term, queryClient]);

    return { reaching: isFetching, found };
};

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

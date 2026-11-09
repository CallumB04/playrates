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
    fetchGameBackdrops,
    fetchGameStats,
    fetchGenres,
    fetchPlatforms,
    fetchPlatformSystems,
    fetchSiteStats,
    queryKeys,
    searchGames,
    type GameListFilters,
} from "../../api";
import { useDebouncedValue } from "../useDebouncedValue";

const REACH_PAUSE_MS = 600;

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
    /* Each reach can write twenty games, so only the term someone stopped
       at goes, not every one they typed through on the way. */
    const paused = useDebouncedValue(term, REACH_PAUSE_MS);
    const wanted = enabled && term.length >= 2;
    const { data, isFetching } = useQuery({
        queryKey: queryKeys.games.reach(term),
        queryFn: () => searchGames(term),
        enabled: wanted && paused === term,
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

    return {
        reaching: isFetching || (wanted && !data && paused !== term),
        found,
    };
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

/** Kept for the session: the first ask may go to IGDB, and the answer is
 *  then fixed on the server. */
export const useGameBackdrops = (id: number | undefined) =>
    useQuery({
        queryKey: queryKeys.games.backdrops(id ?? 0),
        queryFn: () => fetchGameBackdrops(id!),
        enabled: typeof id === "number" && id > 0,
        staleTime: Infinity,
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

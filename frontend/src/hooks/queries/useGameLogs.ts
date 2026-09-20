import {
    keepPreviousData,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import type { GameLogInput } from "@playrates/shared";
import {
    deleteGameLog,
    fetchMyGameLogIds,
    fetchMyGameLogs,
    fetchUserGameLogs,
    fetchUserStats,
    queryKeys,
    saveGameLog,
    type GameLogPage,
} from "../../api";
import { useAuth } from "../../contexts/AuthContext";

export const useMyGameLogs = (status?: string, page?: GameLogPage) => {
    const { user } = useAuth();
    return useQuery({
        queryKey: queryKeys.gameLogs.mine(status, page?.page),
        queryFn: () => fetchMyGameLogs(status, page),
        enabled: !!user,
        placeholderData: keepPreviousData,
    });
};

export const useUserGameLogs = (
    username: string,
    status?: string,
    page?: GameLogPage
) =>
    useQuery({
        queryKey: queryKeys.gameLogs.byUsername(username, status, page?.page),
        queryFn: () => fetchUserGameLogs(username, status, page),
        enabled: !!username,
        placeholderData: keepPreviousData,
    });

/**
 * Every game the caller has logged, as a lookup. Unpaginated on purpose — a
 * tile asking "have I logged this?" needs a complete answer, and the paged
 * list gave a wrong one past the first page.
 */
export const useMyGameLogIds = () => {
    const { user } = useAuth();
    return useQuery({
        queryKey: queryKeys.gameLogs.mineIds,
        queryFn: fetchMyGameLogIds,
        enabled: !!user,
        staleTime: 60_000,
    });
};

export const useUserStats = (username: string, year?: number) =>
    useQuery({
        queryKey: queryKeys.userStats(username, year),
        queryFn: () => fetchUserStats(username, year),
        enabled: !!username,
    });

/**
 * Writes invalidate every query a log affects — the lists, the game's stats
 * and the site totals — so no caller has to know what else went stale.
 */
export const useGameLogMutations = () => {
    const queryClient = useQueryClient();

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ["gamelogs"] });
        queryClient.invalidateQueries({ queryKey: ["games"] });
        queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    };

    const save = useMutation({
        mutationFn: ({
            gameId,
            input,
        }: {
            gameId: number;
            input: GameLogInput;
        }) => saveGameLog(gameId, input),
        onSuccess: invalidate,
    });

    const remove = useMutation({
        mutationFn: (gameId: number) => deleteGameLog(gameId),
        onSuccess: invalidate,
    });

    return { save, remove };
};

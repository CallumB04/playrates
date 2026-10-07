import {
    keepPreviousData,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import type { GameLogInput, GameLogSummary } from "@playrates/shared";
import {
    deleteGameLog,
    fetchMyGameLog,
    fetchMyGameLogIds,
    fetchMyGameLogs,
    fetchUserGameLogs,
    fetchUserStats,
    queryKeys,
    saveGameLog,
    type GameLogPage,
} from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import { useNotify } from "../../contexts/NotificationContext";
import { STATUS_PRESENTATION } from "../../constants/gameStatus";

/** The ordering, flattened for a cache key. */
const orderKey = (page?: GameLogPage) =>
    `${page?.sort ?? ""}:${page?.direction ?? ""}:${page?.playedStatus ?? ""}`;

export const useMyGameLogs = (status?: string, page?: GameLogPage) => {
    const { user } = useAuth();
    return useQuery({
        queryKey: queryKeys.gameLogs.mine(status, page?.page, orderKey(page)),
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
        queryKey: queryKeys.gameLogs.byUsername(
            username,
            status,
            page?.page,
            orderKey(page)
        ),
        queryFn: () => fetchUserGameLogs(username, status, page),
        enabled: !!username,
        placeholderData: keepPreviousData,
    });

/** The caller's own log for one game, so an editor opened with nothing but a
 *  game id still knows what is already recorded. Null means none. */
export const useMyGameLog = (gameId: number, enabled = true) => {
    const { user } = useAuth();
    return useQuery({
        queryKey: queryKeys.gameLogs.mineForGame(gameId),
        queryFn: () => fetchMyGameLog(gameId),
        enabled: enabled && !!user && gameId > 0,
    });
};

/** Every game the caller has logged, as a lookup. Unpaginated: a tile asking
 *  "have I logged this?" needs a complete answer. */
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

/** Writes invalidate the lists, the game's stats and the site totals, so no
 *  caller has to know what else went stale. */
export const useGameLogMutations = () => {
    const queryClient = useQueryClient();

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ["gamelogs"] });
        // a profile's shelf counts and hours, the home page's too
        queryClient.invalidateQueries({ queryKey: ["userStats"] });
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

export type QuickAddStatus = "backlog" | "wishlist";

/**
 * One tap, no popup: backlog and wishlist are a single field each. Says how
 * it went either way, and rejects on failure — the tile that asked holds its
 * other buttons still until it hears back, and has to know when to let go.
 */
export const useQuickAdd = () => {
    const { save } = useGameLogMutations();
    const notify = useNotify();
    const queryClient = useQueryClient();

    return async (gameId: number, title: string, status: QuickAddStatus) => {
        const shelf = STATUS_PRESENTATION[status].label.toLowerCase();

        /* Every tile and badge reading "have I logged this?" shows it at
           once, rather than a round trip later; a failure puts it back. */
        const key = queryKeys.gameLogs.mineIds;
        await queryClient.cancelQueries({ queryKey: key });
        const before = queryClient.getQueryData<GameLogSummary[]>(key);
        if (before && !before.some((log) => log.gameId === gameId)) {
            queryClient.setQueryData<GameLogSummary[]>(key, [
                ...before,
                { gameId, status, playedStatus: null, rating: null, logs: [] },
            ]);
        }

        try {
            await save.mutateAsync({ gameId, input: { status } });
            notify(`${title} added to your ${shelf}`, "success");
        } catch (error) {
            queryClient.setQueryData(key, before);
            notify(`Couldn't add that to your ${shelf}`, "error");
            throw error;
        }
    };
};

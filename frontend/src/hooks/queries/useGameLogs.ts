import {
    keepPreviousData,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import type {
    GameLogCreate,
    GameLogInput,
    GameLogSummary,
    ReviewInput,
} from "@playrates/shared";
import {
    createLog,
    deleteLog,
    deleteLogReview,
    fetchMyGameLogIds,
    fetchMyLogBundle,
    fetchMyShelf,
    fetchUserLogBundle,
    fetchUserShelf,
    fetchUserStats,
    queryKeys,
    saveLogReview,
    updateLog,
    type GameLogPage,
} from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import { useNotify } from "../../contexts/NotificationContext";
import { STATUS_PRESENTATION } from "../../constants/gameStatus";

/** The ordering, flattened for a cache key. */
const orderKey = (page?: GameLogPage) =>
    `${page?.sort ?? ""}:${page?.direction ?? ""}:${page?.playedStatus ?? ""}:${page?.limit ?? ""}`;

export const useMyShelf = (status?: string, page?: GameLogPage) => {
    const { user } = useAuth();
    return useQuery({
        queryKey: queryKeys.gameLogs.mine(status, page?.page, orderKey(page)),
        queryFn: () => fetchMyShelf(status, page),
        enabled: !!user,
        placeholderData: keepPreviousData,
    });
};

export const useUserShelf = (
    username: string,
    status?: string,
    page?: GameLogPage,
    // Off when the games are private to this viewer, so it never asks.
    enabled = true
) =>
    useQuery({
        queryKey: queryKeys.gameLogs.byUsername(
            username,
            status,
            page?.page,
            orderKey(page)
        ),
        queryFn: () => fetchUserShelf(username, status, page),
        enabled: enabled && !!username,
        placeholderData: keepPreviousData,
    });

/** The caller's logs of one game, a review on each, and the totals. */
export const useMyLogBundle = (gameId: number, enabled = true) => {
    const { user } = useAuth();
    return useQuery({
        queryKey: queryKeys.gameLogs.mineForGame(gameId),
        queryFn: () => fetchMyLogBundle(gameId),
        enabled: enabled && !!user && gameId > 0,
    });
};

export const useUserLogBundle = (
    username: string | undefined,
    gameId: number,
    enabled = true
) =>
    useQuery({
        queryKey: queryKeys.gameLogs.forUserAndGame(username ?? "", gameId),
        queryFn: () => fetchUserLogBundle(username!, gameId),
        enabled: enabled && !!username && gameId > 0,
    });

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

export const useUserStats = (username: string, year?: number, enabled = true) =>
    useQuery({
        queryKey: queryKeys.userStats(username, year),
        queryFn: () => fetchUserStats(username, year),
        enabled: enabled && !!username,
    });

/** Writes invalidate the lists, the game's stats and the site totals, so no
 *  caller has to know what else went stale. */
export const useLogMutations = () => {
    const queryClient = useQueryClient();

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ["gamelogs"] });
        // a profile's shelf counts and hours, the home page's too
        queryClient.invalidateQueries({ queryKey: ["userStats"] });
        queryClient.invalidateQueries({ queryKey: ["games"] });
        queryClient.invalidateQueries({ queryKey: queryKeys.stats });
        // a review card shows its log's rating and hours
        queryClient.invalidateQueries({ queryKey: ["reviews"] });
    };

    const create = useMutation({
        mutationFn: (input: GameLogCreate) => createLog(input),
        onSuccess: invalidate,
    });

    const update = useMutation({
        mutationFn: ({
            logId,
            input,
        }: {
            logId: number;
            input: GameLogInput;
        }) => updateLog(logId, input),
        onSuccess: invalidate,
    });

    const remove = useMutation({
        mutationFn: (logId: number) => deleteLog(logId),
        onSuccess: invalidate,
    });

    const saveReview = useMutation({
        mutationFn: ({ logId, input }: { logId: number; input: ReviewInput }) =>
            saveLogReview(logId, input),
        onSuccess: invalidate,
    });

    const removeReview = useMutation({
        mutationFn: (logId: number) => deleteLogReview(logId),
        onSuccess: invalidate,
    });

    return { create, update, remove, saveReview, removeReview };
};

export type QuickAddStatus = "backlog" | "wishlist";

/**
 * One tap, no popup: backlog and wishlist are a single field each. Says how
 * it went either way, and rejects on failure — the tile that asked holds its
 * other buttons still until it hears back, and has to know when to let go.
 */
export const useQuickAdd = () => {
    const { create } = useLogMutations();
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
                {
                    gameId,
                    status,
                    playedStatus: null,
                    rating: null,
                    // A real id comes with the refetch the save sets off.
                    logs: [
                        {
                            id: -gameId,
                            system: null,
                            status,
                            playedStatus: null,
                            rating: null,
                        },
                    ],
                },
            ]);
        }

        try {
            await create.mutateAsync({ gameId, status });
            notify(`${title} added to your ${shelf}`, "success");
        } catch (error) {
            queryClient.setQueryData(key, before);
            notify(`Couldn't add that to your ${shelf}`, "error");
            throw error;
        }
    };
};

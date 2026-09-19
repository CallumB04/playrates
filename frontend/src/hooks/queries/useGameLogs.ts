import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { GameLogInput } from "@playrates/shared";
import {
    deleteGameLog,
    fetchMyGameLogs,
    fetchUserGameLogs,
    queryKeys,
    saveGameLog,
} from "../../api";
import { useAuth } from "../../contexts/AuthContext";

export const useMyGameLogs = (status?: string) => {
    const { user } = useAuth();
    return useQuery({
        queryKey: queryKeys.gameLogs.mine(status),
        queryFn: () => fetchMyGameLogs(status),
        enabled: !!user,
    });
};

export const useUserGameLogs = (username: string, status?: string) =>
    useQuery({
        queryKey: queryKeys.gameLogs.byUsername(username, status),
        queryFn: () => fetchUserGameLogs(username, status),
        enabled: !!username,
    });

/**
 * Invalidation replaces the old pattern of passing `refetch` functions down
 * through props and calling two or three of them by hand after every write.
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

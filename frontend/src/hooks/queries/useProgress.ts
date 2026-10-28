import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
    LeaderboardPeriod,
    ShopItemKey,
    StyleInput,
} from "@playrates/shared";
import {
    buyBackground,
    buyItem,
    fetchBackgrounds,
    fetchGiftFriends,
    giftItem,
    fetchLeaderboard,
    fetchPlayerBadges,
    fetchProgress,
    fetchShop,
    fetchXpRules,
    markProgressSeen,
    markRevealed,
    queryKeys,
    setProgressStyle,
} from "../../api";
import { useAuth } from "../../contexts/AuthContext";

/** For a place that only ever shows for a signed-in member. */
export const useProgressQuery = (enabled = true) =>
    useQuery({
        queryKey: queryKeys.progress.me,
        queryFn: fetchProgress,
        enabled,
        staleTime: 30_000,
    });

export const useProgress = () => useProgressQuery(!!useAuth().user);

/** After a change of your own, everything that shows progress. */
const useSettle = () => {
    const client = useQueryClient();
    const { user } = useAuth();
    return () =>
        Promise.all([
            client.invalidateQueries({ queryKey: queryKeys.progress.all }),
            // Your level and frame ride on your profile too.
            client.invalidateQueries({ queryKey: ["profiles"] }),
            user &&
                client.invalidateQueries({
                    queryKey: queryKeys.progress.badges(user.username),
                }),
        ]);
};

export const useMarkSeen = () =>
    useMutation({
        mutationKey: ["progress", "seen"],
        mutationFn: markProgressSeen,
    });

export const useMarkRevealed = () => {
    const settle = useSettle();
    return useMutation({
        mutationKey: ["progress", "revealed"],
        mutationFn: markRevealed,
        onSuccess: settle,
    });
};

export const useSetStyle = () => {
    const settle = useSettle();
    return useMutation({
        mutationKey: ["progress", "style"],
        mutationFn: (input: StyleInput) => setProgressStyle(input),
        onSuccess: settle,
    });
};

export const useLeaderboard = (period: LeaderboardPeriod) => {
    const { user } = useAuth();
    return useQuery({
        queryKey: queryKeys.progress.leaderboard(period),
        queryFn: () => fetchLeaderboard(period),
        enabled: !!user,
    });
};

export const useGiftFriends = (item: ShopItemKey, enabled: boolean) =>
    useQuery({
        queryKey: queryKeys.progress.giftFriends(item),
        queryFn: () => fetchGiftFriends(item),
        enabled,
    });

export const useGift = () => {
    const settle = useSettle();
    return useMutation({
        mutationKey: ["progress", "gift"],
        mutationFn: giftItem,
        onSuccess: settle,
    });
};

export const useBackgrounds = (enabled = true) => {
    const { user } = useAuth();
    return useQuery({
        queryKey: queryKeys.progress.backgrounds,
        queryFn: fetchBackgrounds,
        enabled: enabled && !!user,
    });
};

export const useBuyBackground = () => {
    const settle = useSettle();
    return useMutation({
        mutationKey: ["progress", "background"],
        mutationFn: buyBackground,
        onSuccess: settle,
    });
};

export const useXpRules = (enabled = true) =>
    useQuery({
        queryKey: queryKeys.progress.rules,
        queryFn: fetchXpRules,
        enabled,
        staleTime: Infinity,
    });

export const usePlayerBadges = (username: string, enabled = true) =>
    useQuery({
        queryKey: queryKeys.progress.badges(username),
        queryFn: () => fetchPlayerBadges(username),
        enabled: enabled && !!username,
    });

export const useShop = () => {
    const { user } = useAuth();
    return useQuery({
        queryKey: queryKeys.progress.shop,
        queryFn: fetchShop,
        enabled: !!user,
    });
};

export const useBuy = () => {
    const settle = useSettle();
    return useMutation({
        mutationKey: ["progress", "buy"],
        mutationFn: (item: ShopItemKey) => buyItem(item),
        onSuccess: settle,
    });
};

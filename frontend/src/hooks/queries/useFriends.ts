import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import type { FriendRelation } from "@playrates/shared";
import {
    acceptFriendRequest,
    fetchFriendActivity,
    fetchMyFriends,
    fetchUserFriends,
    queryKeys,
    removeFriendship,
    sendFriendRequest,
} from "../../api";
import { useAuth } from "../../contexts/AuthContext";

export const useMyFriends = () => {
    const { user } = useAuth();
    return useQuery({
        queryKey: queryKeys.friends.mine,
        queryFn: () => fetchMyFriends(),
        enabled: !!user,
    });
};

export const useFriendActivity = (limit: number) => {
    const { user } = useAuth();
    return useQuery({
        queryKey: queryKeys.friends.activity,
        queryFn: () => fetchFriendActivity(limit),
        enabled: !!user,
        staleTime: 60_000,
    });
};

export const useUserFriends = (username: string) =>
    useQuery({
        queryKey: queryKeys.friends.byUsername(username),
        queryFn: () => fetchUserFriends(username),
        enabled: !!username,
    });

/** Each action invalidates the friends queries, so callers never refetch. */
export const useFriendRelation = (targetUserId: string | undefined) => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { data: friends } = useMyFriends();

    const relation: FriendRelation | null = useMemo(() => {
        if (!targetUserId || !friends) return null;
        return (
            friends.find((edge) => edge.user.id === targetUserId)?.status ??
            null
        );
    }, [friends, targetUserId]);

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ["friends"] });
        /* Notifications carry the relation live, so a request answered
           anywhere has to re-read the inbox rows that quote it. */
        queryClient.invalidateQueries({
            queryKey: queryKeys.notifications.all,
        });
    };

    const send = useMutation({
        mutationFn: () => sendFriendRequest(targetUserId!),
        onSuccess: invalidate,
    });

    const accept = useMutation({
        mutationFn: () => acceptFriendRequest(targetUserId!),
        onSuccess: invalidate,
    });

    // declines, cancels or unfriends, depending on the current status
    const remove = useMutation({
        mutationFn: () => removeFriendship(targetUserId!),
        onSuccess: invalidate,
    });

    return {
        relation,
        isSelf: !!user && user.id === targetUserId,
        isPending: send.isPending || accept.isPending || remove.isPending,
        send,
        accept,
        remove,
    };
};

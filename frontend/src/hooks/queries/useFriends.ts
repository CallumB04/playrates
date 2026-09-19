import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import type { FriendRelation } from "@playrates/shared";
import {
    acceptFriendRequest,
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

export const useUserFriends = (username: string) =>
    useQuery({
        queryKey: queryKeys.friends.byUsername(username),
        queryFn: () => fetchUserFriends(username),
        enabled: !!username,
    });

/**
 * The friend-relationship state machine, previously ~120 lines spread across
 * ProfilePage along with three manual refetch fan-outs after every action.
 */
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
    };

    const send = useMutation({
        mutationFn: () => sendFriendRequest(targetUserId!),
        onSuccess: invalidate,
    });

    const accept = useMutation({
        mutationFn: () => acceptFriendRequest(targetUserId!),
        onSuccess: invalidate,
    });

    // decline, cancel and remove are all this one call
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

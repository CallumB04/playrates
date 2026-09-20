import type { FriendEdge, FriendRelation } from "@playrates/shared";
import { api } from "../client";

export const fetchMyFriends = async (
    status?: FriendRelation
): Promise<FriendEdge[]> => {
    const { data } = await api.get<{ data: FriendEdge[] }>("/me/friends", {
        params: { status },
    });
    return data.data;
};

export const fetchUserFriends = async (
    username: string,
    status?: FriendRelation
): Promise<FriendEdge[]> => {
    const { data } = await api.get<{ data: FriendEdge[] }>(
        `/users/${username}/friends`,
        { params: { status } }
    );
    return data.data;
};

export const sendFriendRequest = async (
    userId: string
): Promise<FriendEdge> => {
    const { data } = await api.post<FriendEdge>("/me/friends/requests", {
        userId,
    });
    return data;
};

export const acceptFriendRequest = async (
    userId: string
): Promise<FriendEdge> => {
    const { data } = await api.post<FriendEdge>(`/me/friends/${userId}/accept`);
    return data;
};

/** Declines, cancels or unfriends, depending on the current status. */
export const removeFriendship = async (userId: string): Promise<void> => {
    await api.delete(`/me/friends/${userId}`);
};

import type {
    FriendActivity,
    FriendEdge,
    FriendRelation,
    GameFan,
    TasteMatch,
    Paginated,
} from "@playrates/shared";
import { api } from "../client";

export const fetchMyFriends = async (
    status?: FriendRelation
): Promise<FriendEdge[]> => {
    const { data } = await api.get<{ data: FriendEdge[] }>("/me/friends", {
        params: { status },
    });
    return data.data;
};

/** What the people you are friends with have been logging. */
export const fetchFriendActivity = async (
    limit: number
): Promise<Paginated<FriendActivity>> => {
    const { data } = await api.get<Paginated<FriendActivity>>(
        "/me/friends/activity",
        { params: { limit } }
    );
    return data;
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

export const fetchTasteMatches = async (): Promise<TasteMatch[]> =>
    (await api.get<{ data: TasteMatch[] }>("/me/friends/matches")).data.data;

/** The same for everyone, so sent without the token for the CDN. */
export const fetchGameFans = async (gameId: number): Promise<GameFan[]> =>
    (
        await api.get<{ data: GameFan[] }>(`/games/${gameId}/fans`, {
            anonymous: true,
        })
    ).data.data;

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

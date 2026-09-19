import type { Db } from "../../config/supabase.js";
import type { FriendshipRow } from "../../types/database.types.js";

/**
 * The table stores one canonical row per relationship with user_a_id sorted
 * before user_b_id, so (a,b) and (b,a) cannot both exist. Callers pass the two
 * users in any order and this module handles the ordering.
 */
export const orderPair = (x: string, y: string): [string, string] =>
    x < y ? [x, y] : [y, x];

export interface FriendshipWithUsers extends FriendshipRow {
    user_a?: FriendProfileRow | null;
    user_b?: FriendProfileRow | null;
}

export interface FriendProfileRow {
    id: string;
    username: string;
    picture_url: string | null;
    bio: string;
    last_seen_at: string;
}

const SELECT_WITH_USERS = `
    *,
    user_a:profiles!friendships_user_a_id_fkey(id, username, picture_url, bio, last_seen_at),
    user_b:profiles!friendships_user_b_id_fkey(id, username, picture_url, bio, last_seen_at)
`;

export interface FriendsRepository {
    listForUser(userId: string): Promise<FriendshipWithUsers[]>;
    find(x: string, y: string): Promise<FriendshipRow | null>;
    create(
        requesterId: string,
        targetId: string
    ): Promise<FriendshipWithUsers>;
    accept(x: string, y: string): Promise<FriendshipWithUsers>;
    remove(x: string, y: string): Promise<void>;
}

export const createFriendsRepository = (db: Db): FriendsRepository => ({
    async listForUser(userId) {
        const { data, error } = await db
            .from("friendships")
            .select(SELECT_WITH_USERS)
            .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
            .order("created_at", { ascending: false });
        if (error) throw error;
        return (data ?? []) as FriendshipWithUsers[];
    },

    async find(x, y) {
        const [a, b] = orderPair(x, y);
        const { data, error } = await db
            .from("friendships")
            .select("*")
            .eq("user_a_id", a)
            .eq("user_b_id", b)
            .maybeSingle();
        if (error) throw error;
        return (data as FriendshipRow | null) ?? null;
    },

    async create(requesterId, targetId) {
        const [a, b] = orderPair(requesterId, targetId);
        const { data, error } = await db
            .from("friendships")
            .insert({
                user_a_id: a,
                user_b_id: b,
                status: "pending",
                requested_by: requesterId,
            })
            .select(SELECT_WITH_USERS)
            .single();
        if (error) throw error;
        return data as FriendshipWithUsers;
    },

    async accept(x, y) {
        const [a, b] = orderPair(x, y);
        const { data, error } = await db
            .from("friendships")
            .update({ status: "accepted" })
            .eq("user_a_id", a)
            .eq("user_b_id", b)
            .select(SELECT_WITH_USERS)
            .single();
        if (error) throw error;
        return data as FriendshipWithUsers;
    },

    async remove(x, y) {
        const [a, b] = orderPair(x, y);
        const { error } = await db
            .from("friendships")
            .delete()
            .eq("user_a_id", a)
            .eq("user_b_id", b);
        if (error) throw error;
    },
});

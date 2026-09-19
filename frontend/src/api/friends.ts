import axios from "axios";
import { UserAccount } from "./users";

const API_IP = import.meta.env.VITE_API_IP; // importing ip from .env if exists
axios.defaults.baseURL = `http://${API_IP ? API_IP : "localhost"}:3000`; // setting base url as env server ip, or localhost if doesnt exist

export interface Friend {
    id: number;
    status: string; // "friend" | "request-sent" | "request-received"
}

export const fetchFriends = async () => {
    try {
        const response = await axios.get("/friends");
        return response.data;
    } catch {
        throw new Error("Error fetching friends");
    }
};

export const fetchFriendsByID = async (id: number): Promise<Friend[]> => {
    try {
        const response = await axios.get<Friend[]>(`/friends/${id}`);
        return response.data;
    } catch {
        throw new Error("Error fetching user friends");
    }
};

export const sendFriendRequest = async (
    fromUser: UserAccount,
    toUser: UserAccount
): Promise<boolean> => {
    try {
        const response = await axios.patch(`/friends/add/${toUser.id}`, {
            id: fromUser.id,
        });

        if (response.status === 204) return true;
        else return false;
    } catch (error) {
        console.error(error);
        return false;
    }
};

export const acceptFriendRequest = async (
    acceptingUser: UserAccount,
    sendingUser: UserAccount
): Promise<boolean> => {
    try {
        const response = await axios.patch(
            `/friends/accept/${sendingUser.id}`,
            {
                id: acceptingUser.id,
            }
        );

        if (response.status === 204) return true;
        else return false;
    } catch (error) {
        console.error(error);
        return false;
    }
};

export const declineFriendRequest = async (
    decliningUser: UserAccount,
    sendingUser: UserAccount
): Promise<boolean> => {
    try {
        const response = await axios.patch(
            `/friends/decline/${sendingUser.id}`,
            {
                id: decliningUser.id,
            }
        );

        if (response.status === 204) return true;
        else return false;
    } catch (error) {
        console.error(error);
        return false;
    }
};

export const cancelFriendRequest = async (
    cancellingUser: UserAccount,
    receivingUser: UserAccount
): Promise<boolean> => {
    try {
        const response = await axios.patch(
            `/friends/cancel/${receivingUser.id}`,
            {
                id: cancellingUser.id,
            }
        );

        if (response.status === 204) return true;
        else return false;
    } catch (error) {
        console.error(error);
        return false;
    }
};

export const removeFriend = async (
    removingUser: UserAccount,
    deletedUser: UserAccount
): Promise<boolean> => {
    try {
        const response = await axios.patch(
            `/friends/remove/${deletedUser.id}`,
            {
                id: removingUser.id,
            }
        );

        if (response.status === 204) return true;
        else return false;
    } catch (error) {
        console.error(error);
        return false;
    }
};

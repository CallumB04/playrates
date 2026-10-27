import type { Game } from "@playrates/shared";
import { api } from "../client";

/** Someone's favourite games, in their order. */
export const fetchUserFavourites = async (
    username: string
): Promise<Game[]> => {
    const { data } = await api.get<Game[]>(`/users/${username}/favourites`);
    return data;
};

/** Replaces the caller's favourites with these, in this order. */
export const setMyFavourites = async (gameIds: number[]): Promise<Game[]> => {
    const { data } = await api.put<Game[]>("/me/favourites", { gameIds });
    return data;
};

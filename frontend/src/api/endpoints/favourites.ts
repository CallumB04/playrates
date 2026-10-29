import type { FavouriteGame } from "@playrates/shared";
import { api } from "../client";

/** Someone's favourite games, in their order. */
export const fetchUserFavourites = async (
    username: string
): Promise<FavouriteGame[]> => {
    const { data } = await api.get<FavouriteGame[]>(
        `/users/${username}/favourites`
    );
    return data;
};

/** Replaces the caller's favourites with these, in this order. */
export const setMyFavourites = async (
    gameIds: number[]
): Promise<FavouriteGame[]> => {
    const { data } = await api.put<FavouriteGame[]>("/me/favourites", {
        gameIds,
    });
    return data;
};

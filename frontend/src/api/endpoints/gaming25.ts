import type {
    Gaming25,
    Gaming25Category,
    Gaming25ImageLayout,
    Gaming25Summary,
    LoveResult,
} from "@playrates/shared";
import { env } from "../../lib/env";
import { api } from "../client";

/** Someone's Gaming 25, as far as the caller may see it. */
export const fetchGaming25 = async (username: string): Promise<Gaming25> => {
    const { data } = await api.get<Gaming25>(`/users/${username}/gaming-25`);
    return data;
};

/** One cell of the caller's own, filled; the grid as it now stands. */
export const setGaming25Pick = async (
    category: Gaming25Category,
    gameId: number
): Promise<Gaming25> => {
    const { data } = await api.put<Gaming25>(
        `/me/gaming-25/picks/${category}`,
        { gameId }
    );
    return data;
};

export const clearGaming25Pick = async (
    category: Gaming25Category
): Promise<Gaming25> => {
    const { data } = await api.delete<Gaming25>(
        `/me/gaming-25/picks/${category}`
    );
    return data;
};

export const toggleGaming25Love = async (
    username: string
): Promise<LoveResult> => {
    const { data } = await api.post<LoveResult>(
        `/users/${username}/gaming-25/love`
    );
    return data;
};

export const fetchMostLovedGaming25s = async (
    limit: number
): Promise<Gaming25Summary[]> => {
    const { data } = await api.get<Gaming25Summary[]>("/gaming-25/most-loved", {
        params: { limit },
    });
    return data;
};

/** The grid drawn as a picture. The version makes each state of it its own
 *  URL, so a cached one is never stale. */
export const gaming25ImageUrl = (
    username: string,
    updatedAt: string | null,
    layout: Gaming25ImageLayout = "portrait"
): string => {
    const params = new URLSearchParams({ layout });
    if (updatedAt) params.set("v", String(Date.parse(updatedAt)));
    return `${env.apiBaseUrl}/api/v1/gaming-25/${encodeURIComponent(username)}/image.png?${params}`;
};

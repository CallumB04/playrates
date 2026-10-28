import type {
    CardThemeKey,
    LeaderboardPeriod,
    LeaderboardRow,
    PlayerBadges,
    Progress,
    Shop,
    ShopItemKey,
    StyleInput,
    XpRule,
} from "@playrates/shared";
import { env } from "../../lib/env";
import { api } from "../client";

export const fetchProgress = async (): Promise<Progress> => {
    const { data } = await api.get<Progress>("/me/progress");
    return data;
};

export const markProgressSeen = async (input: {
    xpEventId?: number;
    badges?: { badge: string; metal: number }[];
}): Promise<void> => {
    await api.post("/me/progress/seen", input);
};

export const markRevealed = async (): Promise<void> => {
    await api.post("/me/progress/revealed");
};

export const setProgressStyle = async (input: StyleInput): Promise<void> => {
    await api.patch("/me/progress/style", input);
};

export const fetchLeaderboard = async (
    period: LeaderboardPeriod
): Promise<LeaderboardRow[]> => {
    const { data } = await api.get<LeaderboardRow[]>("/me/leaderboard", {
        params: { period },
    });
    return data;
};

export const rerollQuest = async (
    period: "week" | "month",
    slot: number
): Promise<void> => {
    await api.post(`/me/quests/${period}/${slot}/reroll`);
};

export const sendReferral = async (username: string): Promise<void> => {
    await api.post("/me/referral", { username });
};

export const fetchXpRules = async (): Promise<XpRule[]> => {
    const { data } = await api.get<XpRule[]>("/progress/rules");
    return data;
};

export const fetchPlayerBadges = async (
    username: string
): Promise<PlayerBadges> => {
    const { data } = await api.get<PlayerBadges>(
        `/progress/${encodeURIComponent(username)}/badges`
    );
    return data;
};

export const fetchShop = async (): Promise<Shop> => {
    const { data } = await api.get<Shop>("/shop");
    return data;
};

export const buyItem = async (
    item: ShopItemKey
): Promise<{ tokens: number; owned: number }> => {
    const { data } = await api.post<{ tokens: number; owned: number }>(
        `/shop/${item}/buy`
    );
    return data;
};

/** The player card picture. `version` changes the address whenever what
 *  it shows does, as the card is cached for good. */
export const playerCardUrl = (
    username: string,
    version: string | number,
    theme?: CardThemeKey
): string => {
    const params = new URLSearchParams({ v: String(version) });
    if (theme) params.set("theme", theme);
    return `${env.apiBaseUrl}/api/v1/progress/${encodeURIComponent(username)}/card.png?${params}`;
};

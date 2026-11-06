import type {
    SteamAchievements,
    SteamImportInput,
    SteamImportResult,
    SteamPreview,
} from "@playrates/shared";
import { api } from "../client";

export const fetchSteamAvailable = async (): Promise<boolean> =>
    (await api.get<{ available: boolean }>("/me/steam")).data.available;

export const previewSteamLibrary = async (
    profile: string
): Promise<SteamPreview> =>
    (await api.post<SteamPreview>("/me/steam/preview", { profile })).data;

export const importSteamLibrary = async (
    input: SteamImportInput
): Promise<SteamImportResult> =>
    (await api.post<SteamImportResult>("/me/steam/import", input)).data;

/** A batch of a library's achievements, STEAM_ACHIEVEMENTS_BATCH at most. */
export const fetchSteamAchievements = async (
    steamId: string,
    appids: number[]
): Promise<SteamAchievements[]> =>
    (
        await api.post<SteamAchievements[]>("/me/steam/achievements", {
            steamId,
            appids,
        })
    ).data;

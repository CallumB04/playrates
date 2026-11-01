import type {
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

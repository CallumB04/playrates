import type {
    ActivityGroup,
    AdminActivityEvent,
    AdminGameEvent,
    AdminGameSummary,
    AdminHealth,
    AdminImportResult,
    AdminMetric,
    AdminMetricDetail,
    AdminOverview,
    AdminPatchNote,
    AdminPullInput,
    AdminPullResult,
    AdminRange,
    AdminUserDetail,
    AdminUserSummary,
    Announcement,
    AnnouncementInput,
    CursorPage,
    GameEventGroup,
    Paginated,
    RawgUsage,
    ServerErrorEntry,
} from "@playrates/shared";
import { api } from "../client";
import { compactParams } from "./games";

export const fetchAdminOverview = async (
    range: AdminRange
): Promise<AdminOverview> =>
    (
        await api.get<AdminOverview>("/admin/stats/overview", {
            params: { range },
        })
    ).data;

export const fetchAdminMetric = async (
    metric: AdminMetric,
    range: AdminRange
): Promise<AdminMetricDetail> =>
    (
        await api.get<AdminMetricDetail>(`/admin/stats/${metric}`, {
            params: { range },
        })
    ).data;

export interface AdminActivityFilters {
    group?: ActivityGroup;
    userId?: string;
}

export const fetchAdminActivity = async (
    filters: AdminActivityFilters,
    before?: number,
    limit = 40
): Promise<CursorPage<AdminActivityEvent>> =>
    (
        await api.get<CursorPage<AdminActivityEvent>>("/admin/activity", {
            params: compactParams({ ...filters, before, limit }),
        })
    ).data;

export interface AdminUsersFilters {
    q?: string;
    sort?: "recent" | "joined" | "active";
    page?: number;
}

export const fetchAdminUsers = async (
    filters: AdminUsersFilters
): Promise<Paginated<AdminUserSummary>> =>
    (
        await api.get<Paginated<AdminUserSummary>>("/admin/users", {
            params: compactParams({ ...filters, limit: 25 }),
        })
    ).data;

export const fetchAdminUser = async (id: string): Promise<AdminUserDetail> =>
    (await api.get<AdminUserDetail>(`/admin/users/${id}`)).data;

export const fetchAdminGameEvents = async (
    group: GameEventGroup | undefined,
    before?: number
): Promise<CursorPage<AdminGameEvent>> =>
    (
        await api.get<CursorPage<AdminGameEvent>>("/admin/games/events", {
            params: compactParams({ group, before, limit: 40 }),
        })
    ).data;

export const fetchRawgUsage = async (): Promise<RawgUsage> =>
    (await api.get<RawgUsage>("/admin/games/rawg-usage")).data;

export const correctRawgUsage = async (left: number): Promise<RawgUsage> =>
    (await api.put<RawgUsage>("/admin/games/rawg-usage", { left })).data;

export const searchAdminGames = async (
    q: string
): Promise<AdminGameSummary[]> =>
    (
        await api.get<AdminGameSummary[]>("/admin/games/search", {
            params: { q },
        })
    ).data;

export const pullAdminGames = async (
    input: AdminPullInput
): Promise<AdminPullResult> =>
    (await api.post<AdminPullResult>("/admin/games/pull", input)).data;

export const importAdminGame = async (
    rawgId: number
): Promise<AdminImportResult> =>
    (await api.post<AdminImportResult>("/admin/games/import", { rawgId })).data;

export const resyncAdminGame = async (id: number): Promise<AdminGameSummary> =>
    (await api.post<AdminGameSummary>(`/admin/games/${id}/resync`)).data;

export const setAdminGameTrending = async (
    id: number,
    isTrending: boolean
): Promise<AdminGameSummary> =>
    (await api.patch<AdminGameSummary>(`/admin/games/${id}`, { isTrending }))
        .data;

export const fetchAnnouncements = async (): Promise<Announcement[]> =>
    (await api.get<Announcement[]>("/admin/announcements")).data;

export const sendAnnouncement = async (
    input: AnnouncementInput
): Promise<Announcement> =>
    (await api.post<Announcement>("/admin/announcements", input)).data;

export const sendTestAnnouncement = async (
    input: AnnouncementInput
): Promise<void> => {
    await api.post("/admin/announcements/test", input);
};

export const fetchAdminPatchNotes = async (): Promise<AdminPatchNote[]> =>
    (await api.get<AdminPatchNote[]>("/admin/patch-notes")).data;

export const announcePatchNote = async (
    messageId: number
): Promise<AdminPatchNote> =>
    (await api.post<AdminPatchNote>(`/admin/patch-notes/${messageId}/announce`))
        .data;

export const sendTestPatchNote = async (messageId: number): Promise<void> => {
    await api.post(`/admin/patch-notes/${messageId}/test`);
};

export const retractAnnouncement = async (id: number): Promise<Announcement> =>
    (await api.post<Announcement>(`/admin/announcements/${id}/retract`)).data;

export const fetchAdminHealth = async (): Promise<AdminHealth> =>
    (await api.get<AdminHealth>("/admin/health")).data;

export const fetchServerErrors = async (
    before?: number
): Promise<CursorPage<ServerErrorEntry>> =>
    (
        await api.get<CursorPage<ServerErrorEntry>>("/admin/errors", {
            params: compactParams({ before, limit: 30 }),
        })
    ).data;

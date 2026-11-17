import type {
    AdminCategoryInput,
    AdminEventInput,
    AdminNomineeInput,
    AdminRevealInput,
    AwardPicks,
    EventDetail,
    EventSummary,
    GameEventEntry,
    HeldEventBadge,
    ShowcaseHype,
} from "@playrates/shared";
import { api } from "../client";

/* The same for every visitor: the CDN answers them. */

export const fetchEvents = async (): Promise<EventSummary[]> => {
    const { data } = await api.get<EventSummary[]>("/events", {
        anonymous: true,
    });
    return data;
};

export const fetchCurrentEvent = async (): Promise<EventSummary | null> => {
    const { data } = await api.get<EventSummary | null>("/events/current", {
        anonymous: true,
    });
    return data;
};

export const fetchEvent = async (slug: string): Promise<EventDetail> => {
    const { data } = await api.get<EventDetail>(`/events/${slug}`, {
        anonymous: true,
    });
    return data;
};

/** Every event a game has turned up at, whatever its kind. */
export const fetchGameEvents = async (
    gameId: number
): Promise<GameEventEntry[]> => {
    const { data } = await api.get<GameEventEntry[]>(
        `/games/${gameId}/events`,
        { anonymous: true }
    );
    return data;
};

/** Your badges from an event, by key. */
export const fetchHeldEventBadges = async (
    username: string
): Promise<HeldEventBadge[]> => {
    const { data } = await api.get<HeldEventBadge[]>(
        `/users/${encodeURIComponent(username)}/event-badges`
    );
    return data;
};

export const fetchMyEventBadges = async (slug: string): Promise<string[]> => {
    const { data } = await api.get<string[]>(`/me/events/${slug}/badges`);
    return data;
};

/* Your own hype at a showcase. */

export const fetchMyHype = async (slug: string): Promise<ShowcaseHype> => {
    const { data } = await api.get<ShowcaseHype>(`/me/events/${slug}/hype`);
    return data;
};

/** Answers with every reveal you're now hyped for. */
export const setMyHype = async (
    slug: string,
    revealId: number,
    on: boolean
): Promise<ShowcaseHype> => {
    const path = `/me/events/${slug}/hype/${revealId}`;
    const { data } = on
        ? await api.put<ShowcaseHype>(path)
        : await api.delete<ShowcaseHype>(path);
    return data;
};

/* Your own picks at an awards night. */

export const fetchMyPicks = async (slug: string): Promise<AwardPicks> => {
    const { data } = await api.get<AwardPicks>(`/me/events/${slug}/picks`);
    return data;
};

/** Null clears the category's pick. Answers with every pick you now have. */
export const setMyPick = async (
    slug: string,
    categoryId: number,
    nomineeId: number | null
): Promise<AwardPicks> => {
    const path = `/me/events/${slug}/picks/${categoryId}`;
    const { data } =
        nomineeId === null
            ? await api.delete<AwardPicks>(path)
            : await api.put<AwardPicks>(path, { nomineeId });
    return data;
};

/* Admin. */

export const fetchAdminEvents = async (): Promise<EventSummary[]> => {
    const { data } = await api.get<EventSummary[]>("/admin/events");
    return data;
};

export const fetchAdminEvent = async (id: number): Promise<EventDetail> => {
    const { data } = await api.get<EventDetail>(`/admin/events/${id}`);
    return data;
};

export const createAdminEvent = async (
    input: AdminEventInput
): Promise<EventDetail> => {
    const { data } = await api.post<EventDetail>("/admin/events", input);
    return data;
};

export const updateAdminEvent = async (
    id: number,
    input: AdminEventInput
): Promise<EventDetail> => {
    const { data } = await api.put<EventDetail>(`/admin/events/${id}`, input);
    return data;
};

export const publishAdminEvent = async (
    id: number,
    published: boolean
): Promise<EventDetail> => {
    const { data } = await api.put<EventDetail>(
        `/admin/events/${id}/published`,
        { published }
    );
    return data;
};

export const addAdminCategory = async (
    eventId: number,
    input: AdminCategoryInput
): Promise<EventDetail> => {
    const { data } = await api.post<EventDetail>(
        `/admin/events/${eventId}/categories`,
        input
    );
    return data;
};

export const updateAdminCategory = async (
    categoryId: number,
    input: AdminCategoryInput
): Promise<EventDetail> => {
    const { data } = await api.put<EventDetail>(
        `/admin/events/categories/${categoryId}`,
        input
    );
    return data;
};

export const deleteAdminCategory = async (
    categoryId: number
): Promise<EventDetail> => {
    const { data } = await api.delete<EventDetail>(
        `/admin/events/categories/${categoryId}`
    );
    return data;
};

export const reorderAdminCategories = async (
    eventId: number,
    ids: number[]
): Promise<EventDetail> => {
    const { data } = await api.put<EventDetail>(
        `/admin/events/${eventId}/categories/order`,
        { ids }
    );
    return data;
};

export const addAdminNominee = async (
    categoryId: number,
    input: AdminNomineeInput
): Promise<EventDetail> => {
    const { data } = await api.post<EventDetail>(
        `/admin/events/categories/${categoryId}/nominees`,
        input
    );
    return data;
};

export const deleteAdminNominee = async (
    nomineeId: number
): Promise<EventDetail> => {
    const { data } = await api.delete<EventDetail>(
        `/admin/events/nominees/${nomineeId}`
    );
    return data;
};

export const reorderAdminNominees = async (
    categoryId: number,
    ids: number[]
): Promise<EventDetail> => {
    const { data } = await api.put<EventDetail>(
        `/admin/events/categories/${categoryId}/nominees/order`,
        { ids }
    );
    return data;
};

export const setAdminWinner = async (
    nomineeId: number,
    won: boolean
): Promise<EventDetail> => {
    const { data } = await api.put<EventDetail>(
        `/admin/events/nominees/${nomineeId}/won`,
        { won }
    );
    return data;
};

export const addAdminReveal = async (
    eventId: number,
    input: AdminRevealInput
): Promise<EventDetail> => {
    const { data } = await api.post<EventDetail>(
        `/admin/events/${eventId}/reveals`,
        input
    );
    return data;
};

export const deleteAdminReveal = async (
    revealId: number
): Promise<EventDetail> => {
    const { data } = await api.delete<EventDetail>(
        `/admin/events/reveals/${revealId}`
    );
    return data;
};

export const reorderAdminReveals = async (
    eventId: number,
    ids: number[]
): Promise<EventDetail> => {
    const { data } = await api.put<EventDetail>(
        `/admin/events/${eventId}/reveals/order`,
        { ids }
    );
    return data;
};

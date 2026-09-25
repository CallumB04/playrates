import { COMMUNITY_IMAGE_MIME } from "@playrates/shared";
import type {
    CommunityMessage,
    CreateMessageInput,
    CreateThreadInput,
    Paginated,
    PatchNotesSummary,
    RichTextDoc,
    ThreadCard,
    ThreadDetail,
    ThreadSort,
    TrendingThread,
    VoteResult,
} from "@playrates/shared";
import { api } from "../client";
import { compactParams } from "./games";

export interface ThreadListFilters {
    gameId?: number;
    /** A username: threads they started or replied to. */
    participant?: string;
    sort?: ThreadSort;
    page?: number;
    limit?: number;
}

export const fetchThreads = async (
    filters: ThreadListFilters = {}
): Promise<Paginated<ThreadCard>> => {
    const { data } = await api.get<Paginated<ThreadCard>>(
        "/community/threads",
        { params: compactParams(filters) }
    );
    return data;
};

export const fetchTrendingThreads = async (
    limit = 3
): Promise<TrendingThread[]> => {
    const { data } = await api.get<TrendingThread[]>("/community/trending", {
        params: { limit },
    });
    return data;
};

export const fetchPatchNotes = async (): Promise<PatchNotesSummary> => {
    const { data } = await api.get<PatchNotesSummary>("/community/patch-notes");
    return data;
};

export const fetchThread = async (threadId: number): Promise<ThreadDetail> => {
    const { data } = await api.get<ThreadDetail>(
        `/community/threads/${threadId}`
    );
    return data;
};

export const fetchUserThreads = async (
    username: string,
    limit = 5
): Promise<ThreadCard[]> => {
    const { data } = await api.get<ThreadCard[]>(
        `/users/${username}/community-threads`,
        { params: { limit } }
    );
    return data;
};

export const createThread = async (
    input: CreateThreadInput
): Promise<ThreadDetail> => {
    const { data } = await api.post<ThreadDetail>("/community/threads", input);
    return data;
};

export const postMessage = async (
    threadId: number,
    input: CreateMessageInput
): Promise<CommunityMessage> => {
    const { data } = await api.post<CommunityMessage>(
        `/community/threads/${threadId}/messages`,
        input
    );
    return data;
};

export const editMessage = async (
    messageId: number,
    body: RichTextDoc
): Promise<CommunityMessage> => {
    const { data } = await api.patch<CommunityMessage>(
        `/community/messages/${messageId}`,
        { body }
    );
    return data;
};

export const deleteMessage = async (messageId: number): Promise<void> => {
    await api.delete(`/community/messages/${messageId}`);
};

export const deleteThread = async (threadId: number): Promise<void> => {
    await api.delete(`/community/threads/${threadId}`);
};

export const toggleMessageVote = async (
    messageId: number
): Promise<VoteResult> => {
    const { data } = await api.post<VoteResult>(
        `/community/messages/${messageId}/vote`
    );
    return data;
};

/** The compressed picture as raw bytes, as the avatar upload sends it. */
export const uploadCommunityImage = async (
    image: Blob
): Promise<{ url: string }> => {
    const { data } = await api.post<{ url: string }>(
        "/community/images",
        image,
        { headers: { "Content-Type": COMMUNITY_IMAGE_MIME } }
    );
    return data;
};

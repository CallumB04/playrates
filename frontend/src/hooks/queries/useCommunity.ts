import {
    keepPreviousData,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import type {
    CreateMessageInput,
    CreateThreadInput,
    RichTextDoc,
} from "@playrates/shared";
import {
    createThread,
    deleteMessage,
    deleteThread,
    editMessage,
    fetchLatestReplies,
    fetchPatchNotes,
    fetchTalkedAboutGames,
    fetchThread,
    fetchThreads,
    fetchTrendingThreads,
    fetchUserThreads,
    postMessage,
    queryKeys,
    toggleMessageVote,
    type ThreadListFilters,
} from "../../api";

export const useThreads = (filters: ThreadListFilters, enabled = true) =>
    useQuery({
        queryKey: queryKeys.community.threads({ ...filters }),
        queryFn: () => fetchThreads(filters),
        placeholderData: keepPreviousData,
        enabled,
    });

export const useTrendingThreads = (limit = 3) =>
    useQuery({
        queryKey: queryKeys.community.trending(limit),
        queryFn: () => fetchTrendingThreads(limit),
        staleTime: 60_000,
    });

export const useTalkedAboutGames = (limit = 5) =>
    useQuery({
        queryKey: queryKeys.community.games(limit),
        queryFn: () => fetchTalkedAboutGames(limit),
        staleTime: 60_000,
    });

export const useLatestReplies = (limit = 4) =>
    useQuery({
        queryKey: queryKeys.community.latest(limit),
        queryFn: () => fetchLatestReplies(limit),
        staleTime: 30_000,
    });

export const usePatchNotes = () =>
    useQuery({
        queryKey: queryKeys.community.patchNotes,
        queryFn: fetchPatchNotes,
        staleTime: 5 * 60_000,
    });

export const useThread = (threadId: number | undefined) =>
    useQuery({
        queryKey: queryKeys.community.thread(threadId ?? 0),
        queryFn: () => fetchThread(threadId!),
        enabled: typeof threadId === "number" && threadId > 0,
    });

/** Most recently posted in first, which the full list cannot do: it sorts
 *  by the threads' own activity. */
export const useUserThreads = (username: string | undefined, limit: number) =>
    useQuery({
        queryKey: queryKeys.community.byUsername(username ?? "", limit),
        queryFn: () => fetchUserThreads(username!, limit),
        enabled: !!username,
    });

/** Refetch rather than patch, as reviews do: one message moves a thread's
 *  tallies, its place in the list, trending and a profile at once. */
export const useCommunityMutations = () => {
    const client = useQueryClient();
    const invalidate = () =>
        client.invalidateQueries({ queryKey: queryKeys.community.all });

    return {
        createThread: useMutation({
            mutationFn: (input: CreateThreadInput) => createThread(input),
            onSuccess: invalidate,
        }),
        post: useMutation({
            mutationFn: ({
                threadId,
                input,
            }: {
                threadId: number;
                input: CreateMessageInput;
            }) => postMessage(threadId, input),
            onSuccess: invalidate,
        }),
        edit: useMutation({
            mutationFn: ({
                messageId,
                body,
            }: {
                messageId: number;
                body: RichTextDoc;
            }) => editMessage(messageId, body),
            onSuccess: invalidate,
        }),
        remove: useMutation({
            mutationFn: (messageId: number) => deleteMessage(messageId),
            onSuccess: invalidate,
        }),
        removeThread: useMutation({
            mutationFn: (threadId: number) => deleteThread(threadId),
            onSuccess: invalidate,
        }),
        vote: useMutation({
            mutationFn: (messageId: number) => toggleMessageVote(messageId),
            onSuccess: invalidate,
        }),
    };
};

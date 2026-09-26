export const threadPath = (threadId: number) => `/community/thread/${threadId}`;

export const newThreadPath = (gameId?: number) =>
    gameId ? `/community/new?game=${gameId}` : "/community/new";

/** The community list narrowed to threads someone started or replied to. */
export const participantThreadsPath = (username: string) =>
    `/community?user=${encodeURIComponent(username)}`;

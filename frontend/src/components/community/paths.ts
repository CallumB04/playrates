export const threadPath = (threadId: number) => `/community/thread/${threadId}`;

export const newThreadPath = (gameId?: number) =>
    gameId ? `/community/new?game=${gameId}` : "/community/new";

/** Every cache key in one place — two components asking for the same data
 *  must use the same key, or it gets cached twice. */
export const queryKeys = {
    stats: ["stats"] as const,
    platforms: ["platforms"] as const,
    platformSystems: ["platforms", "systems"] as const,
    genres: ["genres"] as const,

    games: {
        all: ["games"] as const,
        list: (filters: Record<string, unknown>) =>
            ["games", "list", filters] as const,
        byId: (id: number) => ["games", id] as const,
        stats: (id: number) => ["games", id, "stats"] as const,
        search: (term: string) => ["games", "search", term] as const,
    },

    profiles: {
        me: ["profiles", "me"] as const,
        byUsername: (username: string) =>
            ["profiles", "username", username] as const,
        search: (term: string) => ["profiles", "search", term] as const,
    },

    gameLogs: {
        // Page is part of the key, or two pages collide in the cache.
        mine: (status?: string, page?: number) =>
            ["gamelogs", "me", status ?? "all", page ?? 1] as const,
        mineIds: ["gamelogs", "me", "ids"] as const,
        byUsername: (username: string, status?: string, page?: number) =>
            ["gamelogs", username, status ?? "all", page ?? 1] as const,
    },

    userStats: (username: string, year?: number) =>
        ["userStats", username, year ?? "all"] as const,

    reviews: {
        recent: ["reviews", "recent"] as const,
        byGame: (gameId: number, sort?: string) =>
            ["reviews", "game", gameId, sort ?? "recent"] as const,
        mine: (gameId: number) => ["reviews", "me", gameId] as const,
        byUsername: (username: string) =>
            ["reviews", "user", username] as const,
    },

    friends: {
        mine: ["friends", "me"] as const,
        activity: ["friends", "me", "activity"] as const,
        byUsername: (username: string) => ["friends", username] as const,
    },
} as const;

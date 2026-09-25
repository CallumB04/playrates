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
        /* Its own key: the masthead search asks for three, and sharing a
           key would hand the picker that short list. */
        pick: (term: string) => ["games", "search", term, "pick"] as const,
    },

    profiles: {
        me: ["profiles", "me"] as const,
        byUsername: (username: string) =>
            ["profiles", "username", username] as const,
        search: (term: string) => ["profiles", "search", term] as const,
    },

    gameLogs: {
        /* Page, sort and direction are all part of the key — each names a
           different set of rows, and sharing a key caches them as one. */
        mine: (status?: string, page?: number, order?: string) =>
            [
                "gamelogs",
                "me",
                status ?? "all",
                page ?? 1,
                order ?? "",
            ] as const,
        mineIds: ["gamelogs", "me", "ids"] as const,
        mineForGame: (gameId: number) =>
            ["gamelogs", "me", "game", gameId] as const,
        byUsername: (
            username: string,
            status?: string,
            page?: number,
            order?: string
        ) =>
            [
                "gamelogs",
                username,
                status ?? "all",
                page ?? 1,
                order ?? "",
            ] as const,
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

    community: {
        all: ["community"] as const,
        threads: (filters: Record<string, unknown>) =>
            ["community", "threads", filters] as const,
        trending: (limit: number) => ["community", "trending", limit] as const,
        patchNotes: ["community", "patch-notes"] as const,
        thread: (id: number) => ["community", "thread", id] as const,
        byUsername: (username: string) =>
            ["community", "user", username] as const,
    },

    notifications: {
        all: ["notifications"] as const,
        /* The inbox and the archive are separate lists, not one list filtered
           — sharing a key would show the archive's rows under the bell. */
        list: (archived: boolean) =>
            ["notifications", archived ? "archived" : "inbox"] as const,
    },
} as const;

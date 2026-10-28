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
        related: (id: number) => ["games", id, "related"] as const,
        backdrops: (id: number) => ["games", id, "backdrops"] as const,
        search: (term: string) => ["games", "search", term] as const,
        /* Its own key: the masthead search asks for three, and sharing a
           key would hand the picker that short list. */
        pick: (term: string, limit?: number) =>
            ["games", "search", term, "pick", limit ?? null] as const,
        /** The library's reach past the catalogue on an empty search. */
        reach: (term: string) => ["games", "search", term, "library"] as const,
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
        /* Under "gamelogs", so every log write refreshes it with the rest. */
        wishlist: (username: string, system?: string, limit?: number) =>
            [
                "gamelogs",
                "wishlist",
                username,
                system ?? "",
                limit ?? null,
            ] as const,
        wishlistAll: (username: string) =>
            ["gamelogs", "wishlist", username] as const,
        shelfConsoles: (username: string, status: string) =>
            ["gamelogs", "consoles", username, status] as const,
        mineForGame: (gameId: number) =>
            ["gamelogs", "me", "game", gameId] as const,
        forUserAndGame: (username: string, gameId: number) =>
            ["gamelogs", username, "game", gameId] as const,
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
        byUsername: (username: string, page?: number, limit?: number) =>
            ["reviews", "user", username, page ?? 1, limit ?? null] as const,
    },

    favourites: {
        byUsername: (username: string) => ["favourites", username] as const,
    },

    /* All under "lists", so one invalidation after a change reaches every
       card, page and picker that might show it. */
    lists: {
        all: ["lists"] as const,
        byUsername: (
            username: string,
            sort: string,
            page: number,
            limit: number
        ) => ["lists", "user", username, sort, page, limit] as const,
        detail: (listId: number) => ["lists", "detail", listId] as const,
        popular: (page: number, limit: number) =>
            ["lists", "popular", page, limit] as const,
        forGame: (gameId: number, limit: number) =>
            ["lists", "game", gameId, limit] as const,
        mine: (gameId?: number) => ["lists", "mine", gameId ?? null] as const,
    },

    /* All under "progress", so a purchase or a style change refreshes
       everything that shows it. */
    progress: {
        all: ["progress"] as const,
        me: ["progress", "me"] as const,
        badges: (username: string) => ["progress", "badges", username] as const,
        leaderboard: (period: string) =>
            ["progress", "leaderboard", period] as const,
        shop: ["progress", "shop"] as const,
        rules: ["progress", "rules"] as const,
    },

    gaming25: {
        all: ["gaming25"] as const,
        byUsername: (username: string) => ["gaming25", username] as const,
        mostLoved: (limit: number) =>
            ["gaming25", "most-loved", limit] as const,
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
        games: (limit: number) => ["community", "games", limit] as const,
        latest: (limit: number) => ["community", "latest", limit] as const,
        thread: (id: number) => ["community", "thread", id] as const,
    },

    admin: {
        all: ["admin"] as const,
        overview: (range: string) => ["admin", "overview", range] as const,
        metric: (metric: string, range: string) =>
            ["admin", "metric", metric, range] as const,
        activity: (filters: Record<string, unknown>) =>
            ["admin", "activity", filters] as const,
        users: (filters: Record<string, unknown>) =>
            ["admin", "users", filters] as const,
        user: (id: string) => ["admin", "user", id] as const,
        gameEvents: (group: string) =>
            ["admin", "games", "events", group] as const,
        gameSearch: (q: string) => ["admin", "games", "search", q] as const,
        igdbUsage: ["admin", "games", "igdb-usage"] as const,
        announcements: ["admin", "announcements"] as const,
        /* Under announcements, so anything that refreshes the history —
           taking one back above all — refreshes which entries went out. */
        patchNotes: ["admin", "announcements", "patch-notes"] as const,
        health: ["admin", "health"] as const,
        errors: ["admin", "errors"] as const,
        reports: (status: string, page: number) =>
            ["admin", "reports", status, page] as const,
    },

    notifications: {
        all: ["notifications"] as const,
        /* The inbox and the archive are separate lists, not one list filtered
           — sharing a key would show the archive's rows under the bell. */
        list: (archived: boolean) =>
            ["notifications", archived ? "archived" : "inbox"] as const,
    },
} as const;

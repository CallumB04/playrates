/**
 * One place for every cache key.
 *
 * The old code used two different keys for the same data — ProfilePage asked
 * for ["targetUserGameLogs", id] while LibraryPage and GamePage asked for
 * ["currentUserGameLogs", id] — so navigating between them refetched
 * identical rows.
 */
export const queryKeys = {
    stats: ["stats"] as const,
    platforms: ["platforms"] as const,

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
        mine: (status?: string) => ["gamelogs", "me", status ?? "all"] as const,
        byUsername: (username: string, status?: string) =>
            ["gamelogs", username, status ?? "all"] as const,
    },

    reviews: {
        byGame: (gameId: number) => ["reviews", "game", gameId] as const,
        byUsername: (username: string) =>
            ["reviews", "user", username] as const,
    },

    friends: {
        mine: ["friends", "me"] as const,
        byUsername: (username: string) => ["friends", username] as const,
    },
} as const;

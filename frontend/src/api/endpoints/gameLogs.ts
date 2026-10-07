import type {
    GameLog,
    GameLogCreate,
    GameLogInput,
    GameLogSort,
    GameLogSummary,
    LogBundle,
    Paginated,
    PlayedStatusFilter,
    Review,
    ReviewInput,
    ShelfEntry,
    ShelfGame,
    SortDirection,
    UserStats,
} from "@playrates/shared";
import { api } from "../client";
import { compactParams } from "./games";

/** One log with its game, for the places that show a single run: the game
 *  you're playing now, say. */
export interface GameLogWithGame extends GameLog {
    game: ShelfGame | null;
}

/** A shelf entry's log in a given status, with the game beside it. */
export const logOnShelf = (
    entry: ShelfEntry,
    status: string
): GameLogWithGame | undefined => {
    const log = entry.logs.find((l) => l.status === status);
    return log && { ...log, game: entry.game };
};

/** A game's most recent run, so a chart of the year counts it once. */
export const latestRun = (entry: ShelfEntry): GameLogWithGame => {
    const when = (l: GameLog) => l.finishDate ?? l.startDate ?? "";
    const log = entry.logs.reduce((a, b) => (when(b) > when(a) ? b : a));
    return { ...log, game: entry.game };
};

export interface GameLogPage {
    status?: string;
    page?: number;
    limit?: number;
    sort?: GameLogSort;
    direction?: SortDirection;
    playedStatus?: PlayedStatusFilter;
}

/** A page of games, each with every console it was logged on. */
export const fetchMyShelf = async (
    status?: string,
    page?: GameLogPage
): Promise<Paginated<ShelfEntry>> => {
    const { data } = await api.get<Paginated<ShelfEntry>>("/me/shelf", {
        params: compactParams({ status, limit: 25, ...page }),
    });
    return data;
};

export const fetchUserShelf = async (
    username: string,
    status?: string,
    page?: GameLogPage
): Promise<Paginated<ShelfEntry>> => {
    const { data } = await api.get<Paginated<ShelfEntry>>(
        `/users/${username}/shelf`,
        { params: compactParams({ status, limit: 25, ...page }) }
    );
    return data;
};

/** Every game the caller has logged, unpaginated — "have I logged this?"
 *  needs a complete answer, not a page. */
export const fetchMyGameLogIds = async (): Promise<GameLogSummary[]> => {
    const { data } = await api.get<{ data: GameLogSummary[] }>(
        "/me/game-logs/ids"
    );
    return data.data;
};

export const fetchUserStats = async (
    username: string,
    year?: number
): Promise<UserStats> => {
    const { data } = await api.get<UserStats>(`/users/${username}/stats`, {
        params: compactParams({ year }),
    });
    return data;
};

/** The caller's logs of one game, with their reviews and the totals. A game
 *  not logged comes back with no logs, not as a 404. */
export const fetchMyLogBundle = async (gameId: number): Promise<LogBundle> => {
    const { data } = await api.get<LogBundle>("/me/logs", {
        params: { gameId },
    });
    return data;
};

export const fetchUserLogBundle = async (
    username: string,
    gameId: number
): Promise<LogBundle> => {
    const { data } = await api.get<LogBundle>(`/users/${username}/logs`, {
        params: { gameId },
    });
    return data;
};

export const createLog = async (input: GameLogCreate): Promise<GameLog> => {
    const { data } = await api.post<GameLog>("/me/logs", input);
    return data;
};

export const updateLog = async (
    logId: number,
    input: GameLogInput
): Promise<GameLog> => {
    const { data } = await api.put<GameLog>(`/me/logs/${logId}`, input);
    return data;
};

export const deleteLog = async (logId: number): Promise<void> => {
    await api.delete(`/me/logs/${logId}`);
};

export const saveLogReview = async (
    logId: number,
    input: ReviewInput
): Promise<Review> => {
    const { data } = await api.put<Review>(`/me/logs/${logId}/review`, input);
    return data;
};

export const deleteLogReview = async (logId: number): Promise<void> => {
    await api.delete(`/me/logs/${logId}/review`);
};

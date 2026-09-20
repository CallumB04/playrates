import type {
    Game,
    GameLog,
    GameLogInput,
    GameLogPatch,
    GameLogSummary,
    Paginated,
    UserStats,
} from "@playrates/shared";
import { api } from "../client";
import { compactParams } from "./games";

/**
 * List responses embed the game, so a grid of tiles needs no follow-up
 * request per tile.
 */
export interface GameLogWithGame extends GameLog {
    game: Pick<
        Game,
        "id" | "title" | "slug" | "coverUrl" | "releaseDate" | "platforms"
    > | null;
}

export interface GameLogPage {
    status?: string;
    page?: number;
    limit?: number;
}

export const fetchMyGameLogs = async (
    status?: string,
    page?: GameLogPage
): Promise<Paginated<GameLogWithGame>> => {
    const { data } = await api.get<Paginated<GameLogWithGame>>(
        "/me/game-logs",
        { params: compactParams({ status, limit: 25, ...page }) }
    );
    return data;
};

export const fetchUserGameLogs = async (
    username: string,
    status?: string,
    page?: GameLogPage
): Promise<Paginated<GameLogWithGame>> => {
    const { data } = await api.get<Paginated<GameLogWithGame>>(
        `/users/${username}/game-logs`,
        { params: compactParams({ status, limit: 25, ...page }) }
    );
    return data;
};

/**
 * Every game the caller has logged, unpaginated. The "have I logged this?"
 * lookups on the library, game and profile pages were built from a 100-row
 * page, so anyone past that saw their own games as unlogged.
 */
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

/** Idempotent: creates the log, or updates it if one already exists. */
export const saveGameLog = async (
    gameId: number,
    input: GameLogInput
): Promise<GameLogWithGame> => {
    const { data } = await api.put<GameLogWithGame>(
        `/me/game-logs/${gameId}`,
        input
    );
    return data;
};

export const patchGameLog = async (
    gameId: number,
    input: GameLogPatch
): Promise<GameLogWithGame> => {
    const { data } = await api.patch<GameLogWithGame>(
        `/me/game-logs/${gameId}`,
        input
    );
    return data;
};

export const deleteGameLog = async (gameId: number): Promise<void> => {
    await api.delete(`/me/game-logs/${gameId}`);
};

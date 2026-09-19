import type {
    Game,
    GameLog,
    GameLogInput,
    GameLogPatch,
    Paginated,
} from "@playrates/shared";
import { api } from "../client";

/**
 * List responses embed the game, which is what removes the old pattern of
 * every tile fetching its own game — a 27-tile profile made 27 requests.
 */
export interface GameLogWithGame extends GameLog {
    game: Pick<
        Game,
        "id" | "title" | "slug" | "coverUrl" | "releaseDate" | "platforms"
    > | null;
}

export const fetchMyGameLogs = async (
    status?: string
): Promise<Paginated<GameLogWithGame>> => {
    const { data } = await api.get<Paginated<GameLogWithGame>>(
        "/me/game-logs",
        { params: { status, limit: 100 } }
    );
    return data;
};

export const fetchUserGameLogs = async (
    username: string,
    status?: string
): Promise<Paginated<GameLogWithGame>> => {
    const { data } = await api.get<Paginated<GameLogWithGame>>(
        `/users/${username}/game-logs`,
        { params: { status, limit: 100 } }
    );
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

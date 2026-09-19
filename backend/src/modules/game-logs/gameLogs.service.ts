import type {
    GameLogInput,
    GameLogPatch,
    Paginated,
    Pagination,
} from "@playrates/shared";
import { AppError } from "../../lib/AppError.js";
import { paginate, toRange } from "../../lib/pagination.js";
import type { ProfilesRepository } from "../profiles/profiles.repository.js";
import type { GamesRepository } from "../games/games.repository.js";
import type { GameLogsRepository } from "./gameLogs.repository.js";
import {
    toGameLogRow,
    toGameLogWithGame,
    type GameLogWithGame,
} from "./gameLogs.mapper.js";

export const createGameLogsService = (
    repo: GameLogsRepository,
    profiles: ProfilesRepository,
    games: GamesRepository
) => ({
    async listForUsername(
        username: string,
        status: string | undefined,
        pagination: Pagination
    ): Promise<Paginated<GameLogWithGame>> {
        const profile = await profiles.findByUsername(username);
        if (!profile) throw AppError.notFound("Profile");
        return this.listForUser(profile.id, status, pagination);
    },

    async listForUser(
        userId: string,
        status: string | undefined,
        pagination: Pagination
    ): Promise<Paginated<GameLogWithGame>> {
        const { from, to } = toRange(pagination);
        const { rows, total } = await repo.listByUser(userId, status, from, to);
        return paginate(rows.map(toGameLogWithGame), pagination, total);
    },

    async getOwn(userId: string, gameId: number): Promise<GameLogWithGame> {
        const row = await repo.findByUserAndGame(userId, gameId);
        if (!row) throw AppError.notFound("Game log");
        return toGameLogWithGame(row);
    },

    /**
     * Upsert on (user_id, game_id). Making the write idempotent removes the
     * create-versus-edit branch the client used to carry, and means a retry
     * cannot produce a duplicate.
     */
    async upsertOwn(
        userId: string,
        gameId: number,
        input: GameLogInput
    ): Promise<{ log: GameLogWithGame; created: boolean }> {
        const game = await games.findById(gameId);
        if (!game) throw AppError.notFound("Game");

        const { row, created } = await repo.upsert(
            userId,
            gameId,
            toGameLogRow(input)
        );
        return { log: toGameLogWithGame(row), created };
    },

    async patchOwn(
        userId: string,
        gameId: number,
        input: GameLogPatch
    ): Promise<GameLogWithGame> {
        const existing = await repo.findByUserAndGame(userId, gameId);
        // 404 rather than 403: a log that is not yours should not be
        // distinguishable from one that does not exist
        if (!existing) throw AppError.notFound("Game log");

        const patch = toGameLogRow({
            ...input,
            // status is needed to decide whether playedStatus survives
            status: input.status ?? (existing.status as GameLogInput["status"]),
        });

        // don't rewrite status if the caller didn't ask to change it
        if (input.status === undefined) delete patch.status;

        return toGameLogWithGame(await repo.update(existing.id, patch));
    },

    async deleteOwn(userId: string, gameId: number): Promise<void> {
        const existing = await repo.findByUserAndGame(userId, gameId);
        if (!existing) throw AppError.notFound("Game log");
        await repo.remove(existing.id);
    },
});

export type GameLogsService = ReturnType<typeof createGameLogsService>;

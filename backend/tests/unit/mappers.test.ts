import { describe, expect, it } from "vitest";
import { isOnline, toProfile } from "../../src/modules/profiles/profiles.mapper.js";
import {
    toGameLog,
    toGameLogRow,
} from "../../src/modules/game-logs/gameLogs.mapper.js";
import { toGame } from "../../src/modules/games/games.mapper.js";
import { orderPair } from "../../src/modules/friends/friends.repository.js";
import { relationFor } from "@playrates/shared";
import { buildGame, buildGameLog, buildProfile } from "../helpers/fixtures.js";

describe("profile mapper", () => {
    it("maps snake_case columns to the camelCase API shape", () => {
        const profile = toProfile(
            buildProfile({ picture_url: "https://x.test/a.png", bio: "hi" })
        );

        expect(profile).toMatchObject({
            username: "devuser",
            bio: "hi",
            pictureUrl: "https://x.test/a.png",
        });
    });

    it("never exposes a password or email field", () => {
        const profile = toProfile(buildProfile());

        expect(profile).not.toHaveProperty("password");
        expect(profile).not.toHaveProperty("email");
    });

    describe("online derivation", () => {
        const now = Date.parse("2026-01-01T12:00:00.000Z");

        it("is online just inside the window", () => {
            expect(isOnline("2026-01-01T11:56:00.000Z", now)).toBe(true);
        });

        it("is offline just outside the window", () => {
            expect(isOnline("2026-01-01T11:54:00.000Z", now)).toBe(false);
        });
    });
});

describe("game log mapper", () => {
    it("exposes the log id as `id` and the game id as `gameId`", () => {
        const log = toGameLog(buildGameLog({ id: 42, game_id: 7 }));

        expect(log.id).toBe(42);
        expect(log.gameId).toBe(7);
    });

    it("returns numeric ratings as numbers, not strings", () => {
        // Postgres numeric can arrive as a string depending on the driver
        const log = toGameLog(
            buildGameLog({ rating: "9.25" as unknown as number })
        );

        expect(log.rating).toBe(9.25);
        expect(typeof log.rating).toBe("number");
    });

    it("keeps playedStatus for a played game", () => {
        const row = toGameLogRow({
            status: "played",
            playedStatus: "mastered",
        });

        expect(row.played_status).toBe("mastered");
    });

    it("clears playedStatus for any other status", () => {
        for (const status of ["playing", "backlog", "wishlist"] as const) {
            const row = toGameLogRow({ status, playedStatus: "finished" });
            expect(row.played_status).toBeNull();
        }
    });

    it("only writes the fields that were provided", () => {
        const row = toGameLogRow({ rating: 5 });

        expect(row).toHaveProperty("rating", 5);
        expect(row).not.toHaveProperty("hours_played");
        expect(row).not.toHaveProperty("platform_slug");
    });

    it("writes an explicit null when a field is cleared", () => {
        const row = toGameLogRow({ rating: null });

        expect(row.rating).toBeNull();
    });
});

describe("game mapper", () => {
    it("flattens the joined platforms into slugs", () => {
        const game = toGame({
            ...buildGame(),
            game_platforms: [
                { platform_slug: "steam" },
                { platform_slug: "xbox" },
            ],
        });

        expect(game.platforms).toEqual(["steam", "xbox"]);
    });

    it("defaults to an empty platform list when the join is absent", () => {
        const game = toGame({ ...buildGame(), game_platforms: null });

        expect(game.platforms).toEqual([]);
    });

    it("renames trending and eighteenPlus to the new field names", () => {
        const game = toGame({
            ...buildGame({ is_trending: true, is_adult: true }),
        });

        expect(game.isTrending).toBe(true);
        expect(game.isAdult).toBe(true);
    });
});

describe("friendship pair ordering", () => {
    it("produces the same canonical pair whichever way round it is given", () => {
        expect(orderPair("b", "a")).toEqual(["a", "b"]);
        expect(orderPair("a", "b")).toEqual(["a", "b"]);
    });
});

describe("friend relation", () => {
    it("reads as friends once accepted, from either side", () => {
        expect(relationFor("accepted", "a", "a")).toBe("friend");
        expect(relationFor("accepted", "a", "b")).toBe("friend");
    });

    it("distinguishes sent from received while pending", () => {
        expect(relationFor("pending", "a", "a")).toBe("request-sent");
        expect(relationFor("pending", "a", "b")).toBe("request-received");
    });
});

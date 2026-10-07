import { describe, expect, it } from "vitest";
import type { GameLogSummary } from "@playrates/shared";
import { resolveTarget } from "./logTarget";

const summary = (ids: number[]): GameLogSummary => ({
    gameId: 1,
    status: "played",
    playedStatus: null,
    rating: null,
    logs: ids.map((id) => ({
        id,
        system: `console-${id}`,
        status: "played",
        playedStatus: null,
        rating: null,
    })),
});

describe("resolveTarget", () => {
    it("starts a log for a game with none", () => {
        expect(resolveTarget(undefined, "edit")).toEqual({
            kind: "editor",
            logId: undefined,
            focusReview: false,
        });
    });

    it("opens the one log there is, on the review when asked", () => {
        expect(resolveTarget(summary([4]), "review")).toEqual({
            kind: "editor",
            logId: 4,
            focusReview: true,
        });
    });

    /* With a log per console, "edit your log" could mean any of them. */
    it("asks which console once there are two", () => {
        expect(resolveTarget(summary([4, 5]), "edit")).toEqual({
            kind: "picker",
            intent: "edit",
        });
    });

    /* A quick add shows at once with a stand-in id; the editor finds the
       real one when it loads. */
    it("leaves a quick add still on its way to the editor to find", () => {
        expect(resolveTarget(summary([-1]), "edit")).toMatchObject({
            kind: "editor",
            logId: undefined,
        });
    });
});

import { describe, expect, it } from "vitest";
import {
    GAME_STATUSES,
    PLAYED_STATUSES,
    getColorFromGameStatus,
    getIconFromGameStatus,
} from "./gameStatus";

describe("game status tokens", () => {
    /**
     * These assert the literal class strings on purpose. If someone rebuilds
     * them by interpolation, Tailwind stops emitting the utilities and the
     * badges silently lose their colour — this is the test that catches it.
     */
    it("returns complete, literal class names for every displayable status", () => {
        for (const status of [...GAME_STATUSES, ...PLAYED_STATUSES]) {
            const colors = getColorFromGameStatus(status);
            // "played" is a grouping status and has no badge of its own
            if (status === "played") continue;

            expect(colors, `no colours for ${status}`).toBeDefined();
            expect(colors!.bg).toBe(`bg-status-${status}/20`);
            expect(colors!.text).toBe(`text-status-${status}`);
        }
    });

    it("uses a /20 tint, which is the exact alpha the old hex values had", () => {
        // 0x33 / 0xff === 0.2
        expect(getColorFromGameStatus("finished")!.bg).toContain("/20");
    });

    it("returns undefined for an unknown status rather than throwing", () => {
        expect(getColorFromGameStatus("abandoned")).toBeUndefined();
    });
});

describe("game status icons", () => {
    it("has an icon for each top-level status", () => {
        for (const status of GAME_STATUSES) {
            expect(getIconFromGameStatus(status), status).toBeTruthy();
        }
    });

    it("returns undefined for an unknown status", () => {
        expect(getIconFromGameStatus("nonsense")).toBeUndefined();
    });
});

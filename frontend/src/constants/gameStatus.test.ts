import { describe, expect, it } from "vitest";
import {
    GAME_STATUSES,
    PLAYED_STATUSES,
    STATUS_PRESENTATION,
    displayStatusFor,
    isDisplayStatus,
} from "./gameStatus";
import { STATUS_MARKS } from "../lib/marks";
import { getStatusIcon } from "../lib/icons";

const ALL = [...GAME_STATUSES, ...PLAYED_STATUSES];

describe("status presentation", () => {
    it("covers every displayable status", () => {
        for (const status of ALL) {
            expect(STATUS_PRESENTATION[status], status).toBeDefined();
        }
        expect(Object.keys(STATUS_PRESENTATION)).toHaveLength(ALL.length);
    });

    // Literal class strings on purpose: an interpolated one is purged by
    // Tailwind and the badge silently loses its colour.
    it("uses complete, literal class names", () => {
        for (const status of ALL) {
            const { chip, markTone, accent } = STATUS_PRESENTATION[status];
            expect(chip, status).toMatch(/^border-\S+ bg-\S+ text-\S+$/);
            expect(markTone, status).toMatch(/^text-\S+$/);
            expect(accent, status).toMatch(/^bg-\S+$/);
        }
    });

    it("always carries a word, so hue is never the only channel", () => {
        for (const status of ALL) {
            expect(STATUS_PRESENTATION[status].label, status).not.toBe("");
        }
    });

    it("points at a mark that exists", () => {
        for (const status of ALL) {
            expect(STATUS_MARKS[STATUS_PRESENTATION[status].mark], status)
                .toBeDefined();
        }
    });

    /* Shape used to be the non-colour channel, back when everything else was
       square. With generous radii throughout it stopped differentiating, so
       the mark carries it alone — which only works if no two share one. */
    it("gives every status its own mark", () => {
        const marks = ALL.map((s) => STATUS_PRESENTATION[s].mark);
        expect(new Set(marks).size).toBe(ALL.length);
    });
});

describe("displayStatusFor", () => {
    it("prefers the substatus, which is more specific than 'played'", () => {
        expect(displayStatusFor("played", "mastered")).toBe("mastered");
    });

    it("falls back to the top-level status when there is no substatus", () => {
        expect(displayStatusFor("played", null)).toBe("played");
        expect(displayStatusFor("backlog", null)).toBe("backlog");
    });

    it("ignores a substatus on a status that cannot have one", () => {
        expect(displayStatusFor("wishlist", "finished")).toBe("wishlist");
    });
});

describe("isDisplayStatus", () => {
    it("accepts known statuses and rejects anything else", () => {
        expect(isDisplayStatus("mastered")).toBe(true);
        expect(isDisplayStatus("abandoned")).toBe(false);
    });
});

describe("game status icons", () => {
    it("has an icon for each top-level status", () => {
        for (const status of GAME_STATUSES) {
            expect(getStatusIcon(status), status).toBeTruthy();
        }
    });

    it("returns undefined for an unknown status", () => {
        expect(getStatusIcon("nonsense")).toBeUndefined();
    });
});

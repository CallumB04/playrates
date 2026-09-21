import { describe, expect, it } from "vitest";
import { ELLIPSIS, pageRange } from "./pageRange";

describe("pageRange", () => {
    it("lists every page when they all fit", () => {
        expect(pageRange(1, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
        expect(pageRange(4, 1)).toEqual([1]);
    });

    it("elides the tail near the start", () => {
        expect(pageRange(1, 6595)).toEqual([1, 2, 3, 4, 5, ELLIPSIS, 6595]);
        expect(pageRange(3, 6595)).toEqual([1, 2, 3, 4, 5, ELLIPSIS, 6595]);
    });

    it("elides the head near the end", () => {
        expect(pageRange(6595, 6595)).toEqual([
            1,
            ELLIPSIS,
            6591,
            6592,
            6593,
            6594,
            6595,
        ]);
    });

    it("elides both sides in the middle", () => {
        expect(pageRange(3000, 6595)).toEqual([
            1,
            ELLIPSIS,
            2999,
            3000,
            3001,
            ELLIPSIS,
            6595,
        ]);
    });

    it("keeps a constant width, so the control does not jump while paging", () => {
        const widths = [1, 2, 3, 500, 6593, 6594, 6595].map(
            (p) => pageRange(p, 6595).length
        );
        expect(new Set(widths).size).toBe(1);
    });

    it("never emits a gap that hides exactly one page", () => {
        for (let count = 8; count <= 40; count++) {
            for (let page = 1; page <= count; page++) {
                const slots = pageRange(page, count);
                slots.forEach((slot, i) => {
                    if (slot !== ELLIPSIS) return;
                    const before = slots[i - 1] as number;
                    const after = slots[i + 1] as number;
                    expect(
                        after - before,
                        `page ${page} of ${count} elides a single page`
                    ).toBeGreaterThan(2);
                });
            }
        }
    });

    it("always includes the current page", () => {
        for (let page = 1; page <= 60; page++) {
            expect(pageRange(page, 60), `page ${page}`).toContain(page);
        }
    });
});

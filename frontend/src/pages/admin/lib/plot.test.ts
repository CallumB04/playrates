import { describe, expect, it } from "vitest";
import { addedIn, barIndexAt, changeWords, groupByDay, plotPeak, timeInDay } from "./plot";

describe("barIndexAt", () => {
    it("finds the bar under the pointer, and clamps the gutters", () => {
        expect(barIndexAt(0, 300, 30)).toBe(0);
        expect(barIndexAt(155, 300, 30)).toBe(15);
        expect(barIndexAt(320, 300, 30)).toBe(29);
        expect(barIndexAt(-5, 300, 30)).toBe(0);
    });
});

describe("plotPeak", () => {
    it("is the tallest stack, never zero, and reaches a marker above it", () => {
        const bars = [
            { key: "a", segments: [{ key: "x", value: 2, className: "" }, { key: "y", value: 3, className: "" }] },
            { key: "b", segments: [{ key: "x", value: 1, className: "" }] },
        ];
        expect(plotPeak(bars)).toBe(5);
        expect(plotPeak([])).toBe(1);
        expect(plotPeak(bars, 9)).toBe(9);
    });
});

describe("changeWords", () => {
    it("gives the signed figure, with a true minus, and the words after it", () => {
        expect(changeWords({ current: 15, previous: 10, change: 0.5 }, "week")).toEqual({
            figure: "+50%",
            words: "on the week before",
            tone: "up",
        });
        expect(changeWords({ current: 8, previous: 10, change: -0.2 }, "week").figure).toBe("−20%");
    });

    it("says growth from nothing as a sentence, since it has no percentage", () => {
        expect(changeWords({ current: 3, previous: 0, change: null }, "week")).toMatchObject({
            figure: "",
            words: "Up from none the week before",
        });
    });

    it("calls a hair's breadth the same", () => {
        expect(changeWords({ current: 1000, previous: 1001, change: -0.001 }, "week").words).toBe(
            "The same as the week before"
        );
    });
});

describe("addedIn", () => {
    it("never puts a plus on a zero", () => {
        expect(addedIn(0, "30 days")).toBe("none in 30 days");
        expect(addedIn(1200, "30 days")).toBe("+1,200 in 30 days");
    });
});

describe("groupByDay", () => {
    const now = new Date("2026-09-26T15:00:00Z");
    const items = [
        { at: "2026-09-26T09:00:00Z" },
        { at: "2026-09-26T01:00:00Z" },
        { at: "2026-09-25T20:00:00Z" },
        { at: "2026-09-23T12:00:00Z" },
        { at: "2026-08-02T12:00:00Z" },
    ];

    it("names today and yesterday, this week by weekday, and older by date", () => {
        const groups = groupByDay(items, (i) => i.at, now, "UTC");
        expect(groups.map((g) => [g.label, g.items.length])).toEqual([
            ["Today", 2],
            ["Yesterday", 1],
            ["Wednesday 23 Sept", 1],
            ["2 Aug 2026", 1],
        ]);
    });

    it("draws the day line in the viewer's zone, not UTC", () => {
        // At 10:00 UTC on the 26th, 23:30 UTC the night before was yesterday
        // in London but already this morning in Tokyo.
        const morning = new Date("2026-09-26T10:00:00Z");
        const late = [{ at: "2026-09-25T23:30:00Z" }];
        expect(groupByDay(late, (i) => i.at, morning, "UTC")[0]!.label).toBe("Yesterday");
        expect(groupByDay(late, (i) => i.at, morning, "Asia/Tokyo")[0]!.label).toBe("Today");
    });
});

describe("timeInDay", () => {
    it("leaves today to relative time, and gives any other day the clock", () => {
        expect(timeInDay("2026-09-23T14:43:00Z", "Today", "UTC")).toBe("");
        expect(timeInDay("2026-09-23T14:43:00Z", "Wednesday 23 Sept", "UTC")).toBe("14:43");
    });
});

import { describe, expect, it } from "vitest";
import { pointsChange, rate, reachedCurve } from "./staying";

const point = (day: number, of: number) => ({
    day,
    everyone: { of, back: 0 },
    invited: { of: 0, back: 0 },
});

describe("rate", () => {
    it("rounds to a whole percent, with nobody to divide by as null", () => {
        expect(rate({ back: 1, of: 3 })).toBe(33);
        expect(rate({ back: 0, of: 0 })).toBeNull();
    });
});

describe("pointsChange", () => {
    it("says a rate's change in points, not as a share of a share", () => {
        expect(
            pointsChange(
                { back: 30, of: 100 },
                { back: 25, of: 100 },
                "30 days"
            )
        ).toEqual({
            figure: "+5 pts",
            words: "on the 30 days before",
            tone: "up",
        });
        expect(
            pointsChange({ back: 1, of: 10 }, { back: 2, of: 10 }, "30 days")
                .figure
        ).toBe("−10 pts");
    });

    it("says when there's nothing to compare, or no change", () => {
        expect(
            pointsChange({ back: 1, of: 2 }, { back: 0, of: 0 }, "7 days")
        ).toEqual({
            figure: "",
            words: "Nothing to compare with the 7 days before",
            tone: "flat",
        });
        expect(
            pointsChange({ back: 1, of: 2 }, { back: 2, of: 4 }, "7 days").words
        ).toBe("The same as the 7 days before");
    });
});

describe("reachedCurve", () => {
    it("stops at the last day anyone has reached", () => {
        expect(
            reachedCurve([
                point(1, 5),
                point(2, 3),
                point(3, 0),
                point(4, 0),
            ]).map((p) => p.day)
        ).toEqual([1, 2]);
        expect(reachedCurve([point(1, 0)])).toEqual([]);
    });
});

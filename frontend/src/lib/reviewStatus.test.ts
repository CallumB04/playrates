import { describe, expect, it } from "vitest";
import { reviewStatus } from "./reviewStatus";

describe("reviewStatus", () => {
    it("shows how a played game ended, where the log says", () => {
        expect(
            reviewStatus({ status: "played", playedStatus: "mastered" })
        ).toBe("mastered");
    });

    it("falls back to the shelf when there's no ending", () => {
        expect(reviewStatus({ status: "playing", playedStatus: null })).toBe(
            "playing"
        );
    });

    it("shows nothing once the author has no log of it", () => {
        expect(reviewStatus({ status: null, playedStatus: null })).toBeNull();
    });

    it("shows nothing for a status it doesn't know", () => {
        expect(
            reviewStatus({ status: "abandoned", playedStatus: null })
        ).toBeNull();
    });
});

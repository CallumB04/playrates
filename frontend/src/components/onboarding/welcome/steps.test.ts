import { describe, expect, it } from "vitest";
import { nextStep, stepFrom, TRACK_LABELS, trackIndex } from "./steps";

describe("welcome steps", () => {
    it("starts at the first step for a link that names none, or a wrong one", () => {
        expect(stepFrom(null)).toBe("you");
        expect(stepFrom("admin")).toBe("you");
        expect(stepFrom("rate")).toBe("rate");
    });

    it("goes on in order and stays on the last", () => {
        expect(nextStep("you")).toBe("games");
        expect(nextStep("tour")).toBe("done");
        expect(nextStep("done")).toBe("done");
    });

    it("puts each step after the account on the track", () => {
        expect(trackIndex("you")).toBe(1);
        expect(TRACK_LABELS[trackIndex("done")]).toBe("Done");
    });
});

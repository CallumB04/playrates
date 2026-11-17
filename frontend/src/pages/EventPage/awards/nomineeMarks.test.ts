import { describe, expect, it } from "vitest";
import {
    Clapperboard,
    Puzzle,
    Shield,
    Sparkles,
    User,
    Video,
} from "lucide-react";
import { markFor } from "./nomineeMarks";

describe("markFor", () => {
    it("marks each kind of named nominee by its category", () => {
        expect(markFor("best-adaptation")).toBe(Clapperboard);
        expect(markFor("best-user-creation")).toBe(Puzzle);
        expect(markFor("best-esports-team")).toBe(Shield);
        expect(markFor("content-creator-of-the-year")).toBe(Video);
        expect(markFor("best-esports-athlete")).toBe(User);
    });

    it("falls back to a general mark for a category it doesn't know", () => {
        expect(markFor("best-something-new")).toBe(Sparkles);
    });
});

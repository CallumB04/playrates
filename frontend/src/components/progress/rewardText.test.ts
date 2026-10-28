import { describe, expect, it } from "vitest";
import { badgeDef, type BadgeDef } from "@playrates/shared";
import {
    badgeToastText,
    nextReward,
    unlocksAt,
    xpToastText,
} from "./rewardText";

describe("xpToastText", () => {
    it("adds it up and says what for, each reason once", () => {
        expect(
            xpToastText([
                { id: 1, source: "finish", xp: 20 },
                { id: 2, source: "rate", xp: 5 },
                { id: 3, source: "rate", xp: 5 },
            ])
        ).toBe("+30 XP: Finished a game, Rated a game");
    });

    it("keeps to two reasons", () => {
        expect(
            xpToastText([
                { id: 1, source: "finish", xp: 20 },
                { id: 2, source: "rate", xp: 5 },
                { id: 3, source: "bio", xp: 10 },
            ])
        ).toBe("+35 XP: Finished a game, Rated a game and 1 more");
    });
});

describe("badgeToastText", () => {
    it("names the metal only where a badge has more than one", () => {
        expect(badgeToastText(badgeDef("collector") as BadgeDef, 2)).toBe(
            "New badge: Collector, Silver"
        );
        expect(badgeToastText(badgeDef("gaming_25") as BadgeDef, 3)).toBe(
            "New badge: Gaming 25"
        );
    });
});

describe("unlocksAt", () => {
    it("names what a level opens, and nothing for one that opens nothing", () => {
        const labels = (level: number) => unlocksAt(level).map((r) => r.label);
        expect(labels(20)).toEqual(["Gold frame", "Gold card theme"]);
        expect(labels(15)).toEqual(["Orbitron name font"]);
        expect(labels(2)).toEqual([]);
    });
});

describe("nextReward", () => {
    it("finds the next level that opens something", () => {
        expect(nextReward(1)).toMatchObject({ level: 5, kind: "frame" });
        expect(nextReward(15)).toMatchObject({ level: 20 });
        expect(nextReward(100)).toBeUndefined();
    });
});

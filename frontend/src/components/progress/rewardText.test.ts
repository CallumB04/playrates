import { describe, expect, it } from "vitest";
import { badgeDef, levelTokens, type BadgeDef } from "@playrates/shared";
import {
    badgeToastText,
    nextReward,
    tokensBetween,
    unlocksBetween,
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

describe("unlocksBetween", () => {
    const labels = (to: number, from?: number) =>
        unlocksBetween(to, from).map((r) => r.label);

    it("names what a level opens, and nothing for one that opens nothing", () => {
        expect(labels(20)).toEqual(["Gold frame", "Gold card theme"]);
        expect(labels(15)).toEqual(["Orbitron name font", "GG reaction"]);
        expect(labels(2)).toEqual([]);
    });

    it("counts reactions and backgrounds as unlocks too", () => {
        expect(labels(3)).toEqual(["Fire reaction", "Profile backgrounds"]);
    });

    // A badge can lift you several levels at once; each one's unlocks count.
    it("covers every level in a climb", () => {
        expect(labels(8, 4)).toEqual([
            "Bronze frame",
            "Sky name colour",
            "Love reaction",
            "Arcade name font",
        ]);
    });
});

describe("tokensBetween", () => {
    it("adds up every level in a climb", () => {
        expect(tokensBetween(2)).toBe(levelTokens(2));
        expect(tokensBetween(10, 8)).toBe(levelTokens(9) + levelTokens(10));
    });
});

describe("nextReward", () => {
    it("finds the next level that opens something", () => {
        expect(nextReward(1)).toMatchObject({ level: 3, kind: "reaction" });
        expect(nextReward(15)).toMatchObject({ level: 20 });
        expect(nextReward(100)).toBeUndefined();
    });
});

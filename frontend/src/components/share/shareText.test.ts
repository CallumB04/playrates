import { describe, expect, it } from "vitest";
import type { BadgeDef } from "@playrates/shared";
import {
    badgeMoment,
    finishedMoment,
    levelMoment,
    shareUrl,
    shelfMoment,
} from "./shareText";

const badge = (tiers: number) =>
    ({
        name: "Collector",
        tiers: Array.from({ length: tiers }),
    }) as unknown as BadgeDef;

describe("share moments", () => {
    it("says a finished game with its rating, where it has one", () => {
        expect(finishedMoment({ id: 7, title: "Hades" }, 9).text).toBe(
            "I just finished Hades and gave it 9/10"
        );
        expect(finishedMoment({ id: 7, title: "Hades" }, 8.25).text).toBe(
            "I just finished Hades and gave it 8.25/10"
        );
        expect(finishedMoment({ id: 7, title: "Hades" }, null, true).text).toBe(
            "I just mastered Hades"
        );
        expect(finishedMoment({ id: 7, title: "Hades" }, null)).toEqual({
            title: "Hades",
            path: "/game/7",
            text: "I just finished Hades",
        });
    });

    it("names a badge's metal only where it has more than one", () => {
        expect(badgeMoment("ana", badge(4), 3).text).toBe(
            "I just earned the Collector, Gold badge on PlayRates"
        );
        expect(badgeMoment("ana", badge(1), 1).title).toBe("Collector");
        expect(badgeMoment("ana", badge(1), 1).path).toBe("/user/ana/badges");
    });

    it("tells a first game from a round number", () => {
        expect(shelfMoment("ana", 1).text).toBe(
            "I just logged my first game on PlayRates"
        );
        expect(shelfMoment("ana", 1000).text).toBe(
            "That’s 1,000 games on my PlayRates shelves"
        );
    });

    it("carries a level", () => {
        expect(levelMoment("ana", 12)).toEqual({
            title: "Level 12",
            path: "/user/ana",
            text: "I just reached level 12 on PlayRates",
        });
    });

    it("adds the invite to a path with or without a query", () => {
        expect(shareUrl("https://playrates.app", "/game/7", "a b")).toBe(
            "https://playrates.app/game/7?ref=a%20b"
        );
        expect(shareUrl("https://playrates.app", "/x?y=1", "ana")).toBe(
            "https://playrates.app/x?y=1&ref=ana"
        );
    });
});

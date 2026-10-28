import { describe, expect, it } from "vitest";
import {
    badgeRows,
    reactionLabel,
    shopLabel,
    sourceLabel,
} from "./progressAdmin";

describe("badgeRows", () => {
    it("splits each badge's holders by metal, most held first", () => {
        const rows = badgeRows([
            { badge: "collector", metal: 1, holders: 2 },
            { badge: "critic", metal: 1, holders: 5 },
            { badge: "collector", metal: 3, holders: 1 },
        ]);
        expect(rows.map((r) => r.badge.key)).toEqual(["critic", "collector"]);
        expect(rows[1]!.holders).toEqual([2, 0, 1, 0]);
        expect(rows[1]!.total).toBe(3);
    });

    it("leaves out a badge that's no longer defined", () => {
        expect(badgeRows([{ badge: "gone", metal: 1, holders: 4 }])).toEqual(
            []
        );
    });
});

describe("labels", () => {
    it("names a shop item with what it is", () => {
        expect(shopLabel("frame_neon")).toBe("Neon frame");
        expect(shopLabel("colour_mint")).toBe("Mint name colour");
        expect(shopLabel("background")).toBe("Profile background");
        expect(shopLabel("retired")).toBe("retired");
    });

    it("falls back to the key for an unknown source or reaction", () => {
        expect(sourceLabel("finish")).toBe("Finished a game");
        expect(sourceLabel("mystery")).toBe("mystery");
        expect(reactionLabel("fire")).toBe("Fire");
        expect(reactionLabel("mystery")).toBe("mystery");
    });
});

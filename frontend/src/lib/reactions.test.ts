import { describe, expect, it } from "vitest";
import { applyReaction, type ReactionView } from "./reactions";

const view = (over: Partial<ReactionView> = {}): ReactionView => ({
    voteCount: 3,
    myReaction: null,
    reactions: [
        { reaction: "upvote", count: 2 },
        { reaction: "fire", count: 1 },
    ],
    ...over,
});

describe("applyReaction", () => {
    it("adds a first reaction", () => {
        expect(applyReaction(view(), "fire")).toEqual({
            voteCount: 4,
            myReaction: "fire",
            reactions: [
                { reaction: "upvote", count: 2 },
                { reaction: "fire", count: 2 },
            ],
        });
    });

    it("takes the same one back, dropping a reaction nobody's left", () => {
        const after = applyReaction(view({ myReaction: "fire" }), "fire");
        expect(after).toEqual({
            voteCount: 2,
            myReaction: null,
            reactions: [{ reaction: "upvote", count: 2 }],
        });
    });

    it("swaps one for another without changing the total", () => {
        const after = applyReaction(view({ myReaction: "upvote" }), "lol");
        expect(after.voteCount).toBe(3);
        expect(after.myReaction).toBe("lol");
        expect(after.reactions).toEqual([
            { reaction: "upvote", count: 1 },
            { reaction: "fire", count: 1 },
            { reaction: "lol", count: 1 },
        ]);
    });
});

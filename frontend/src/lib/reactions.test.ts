import { describe, expect, it } from "vitest";
import {
    applyReaction,
    reactionOrder,
    shownReactions,
    type ReactionView,
} from "./reactions";

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

describe("reactionOrder", () => {
    it("puts the upvote first and the rest by how many", () => {
        expect(
            reactionOrder(
                view({
                    reactions: [
                        { reaction: "love", count: 2 },
                        { reaction: "fire", count: 5 },
                        { reaction: "upvote", count: 1 },
                    ],
                })
            )
        ).toEqual(["upvote", "fire", "love"]);
    });
});

describe("shownReactions", () => {
    const order = ["upvote", "fire", "love", "lol", "gg", "sad"] as const;

    it("shows the first few", () => {
        expect([...shownReactions([...order], null, 3)]).toEqual([
            "upvote",
            "fire",
            "love",
        ]);
    });

    it("keeps yours in sight when it falls past them", () => {
        expect([...shownReactions([...order], "gg", 3)]).toEqual([
            "upvote",
            "fire",
            "love",
            "gg",
        ]);
    });

    it("folds nothing when only one would fold", () => {
        expect(shownReactions([...order], null, 5).size).toBe(6);
    });

    it("ignores a reaction of yours the counts don't have yet", () => {
        expect(shownReactions([...order], "goat", 3).has("goat")).toBe(false);
    });
});

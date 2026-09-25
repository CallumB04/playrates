import { describe, expect, it } from "vitest";
import { whyCannotVote } from "./voting";

describe("whyCannotVote", () => {
    it("lets a signed-in viewer vote on someone else's review", () => {
        expect(whyCannotVote("viewer", "author")).toBeNull();
    });

    it("asks a signed-out viewer to sign in", () => {
        expect(whyCannotVote(undefined, "author")).toBe("Sign in to vote");
    });

    it("stops you voting on your own review", () => {
        expect(whyCannotVote("author", "author")).toBe(
            "You can't upvote your own review"
        );
    });

    it("names what is being voted on", () => {
        expect(whyCannotVote("author", "author", "message")).toBe(
            "You can't upvote your own message"
        );
    });
});

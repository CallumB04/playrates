import { describe, expect, it } from "vitest";
import { whyCannotLove, whyCannotVote } from "./voting";

describe("whyCannotVote", () => {
    it("lets a signed-in viewer vote on someone else's review", () => {
        expect(whyCannotVote("viewer", "author")).toBeNull();
    });

    it("asks a signed-out viewer to sign in", () => {
        expect(whyCannotVote(undefined, "author")).toBe("Join to react");
    });

    it("stops you voting on your own review", () => {
        expect(whyCannotVote("author", "author")).toBe(
            "You can't react to your own review"
        );
    });

    it("names what is being voted on", () => {
        expect(whyCannotVote("author", "author", "message")).toBe(
            "You can't react to your own message"
        );
    });
});

describe("whyCannotLove", () => {
    it("lets a signed-in viewer love someone else's", () => {
        expect(whyCannotLove("viewer", "owner")).toBeNull();
    });

    it("asks a signed-out viewer to sign in, and stops you loving your own", () => {
        expect(whyCannotLove(undefined, "owner")).toBe("Sign in to love it");
        expect(whyCannotLove("owner", "owner")).toBe("You can't love your own");
    });
});

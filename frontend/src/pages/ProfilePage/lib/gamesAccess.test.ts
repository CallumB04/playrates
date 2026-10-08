import { describe, expect, it } from "vitest";
import { gamesAccess } from "./gamesAccess";

const visitor = { isOwner: false, signedIn: false, relation: null };
const stranger = { isOwner: false, signedIn: true, relation: null };
const friend = { isOwner: false, signedIn: true, relation: "friend" as const };

describe("gamesAccess", () => {
    it("shows public games to anyone", () => {
        expect(gamesAccess("everyone", visitor)).toBe("visible");
    });

    it("shows the owner their own games whatever they chose", () => {
        expect(gamesAccess("private", { ...stranger, isOwner: true })).toBe(
            "visible"
        );
    });

    it("shows friends-only games to a friend and nobody else", () => {
        expect(gamesAccess("friends", friend)).toBe("visible");
        expect(gamesAccess("friends", stranger)).toBe("hidden");
        expect(gamesAccess("friends", visitor)).toBe("hidden");
    });

    /* A request is not a friendship. */
    it("keeps friends-only games from someone with a request out", () => {
        expect(
            gamesAccess("friends", { ...stranger, relation: "request-sent" })
        ).toBe("hidden");
    });

    it("hides private games from friends too", () => {
        expect(gamesAccess("private", friend)).toBe("hidden");
    });

    /* Otherwise a friend sees "private" for a moment on every visit. */
    it("waits for the friends list before deciding", () => {
        expect(
            gamesAccess("friends", { ...stranger, relation: undefined })
        ).toBe("unknown");
    });
});

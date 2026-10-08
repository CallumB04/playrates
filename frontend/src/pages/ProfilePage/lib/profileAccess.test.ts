import { describe, expect, it } from "vitest";
import { profileAccess } from "./profileAccess";

const visitor = { isOwner: false, signedIn: false, relation: null };
const stranger = { isOwner: false, signedIn: true, relation: null };
const friend = { isOwner: false, signedIn: true, relation: "friend" as const };

describe("profileAccess", () => {
    it("shows a public profile to anyone", () => {
        expect(profileAccess("everyone", visitor)).toBe("visible");
    });

    it("shows the owner their own profile whatever they chose", () => {
        expect(profileAccess("private", { ...stranger, isOwner: true })).toBe(
            "visible"
        );
    });

    it("shows a friends-only profile to a friend and nobody else", () => {
        expect(profileAccess("friends", friend)).toBe("visible");
        expect(profileAccess("friends", stranger)).toBe("hidden");
        expect(profileAccess("friends", visitor)).toBe("hidden");
    });

    /* A request is not a friendship. */
    it("keeps a friends-only profile from someone with a request out", () => {
        expect(
            profileAccess("friends", { ...stranger, relation: "request-sent" })
        ).toBe("hidden");
    });

    it("hides a private profile from friends too", () => {
        expect(profileAccess("private", friend)).toBe("hidden");
    });

    /* Otherwise a friend sees "private" for a moment on every visit. */
    it("waits for the friends list before deciding", () => {
        expect(
            profileAccess("friends", { ...stranger, relation: undefined })
        ).toBe("unknown");
    });
});

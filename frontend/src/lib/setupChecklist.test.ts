import { describe, expect, it } from "vitest";
import { pendingSetup } from "./setupChecklist";

const facts = (
    overrides: Partial<Parameters<typeof pendingSetup>[0]> = {},
    profile: Partial<Parameters<typeof pendingSetup>[0]["profile"]> = {}
) => ({
    profile: { avatarUrl: null, bio: "", ...profile },
    logCount: 0,
    friendCount: 0,
    ...overrides,
});

const done = (f: ReturnType<typeof facts>) =>
    Object.fromEntries((pendingSetup(f) ?? []).map((s) => [s.key, s.done]));

describe("pendingSetup", () => {
    it("starts a new account on nothing done", () => {
        expect(done(facts())).toEqual({
            picture: false,
            bio: false,
            log: false,
            friend: false,
        });
    });

    it("ticks each step off from what the account holds", () => {
        expect(
            done(facts({ logCount: 3 }, { avatarUrl: "https://x.test/a.webp" }))
        ).toEqual({ picture: true, bio: false, log: true, friend: false });
    });

    it("does not count a bio of spaces", () => {
        expect(done(facts({}, { bio: "   " })).bio).toBe(false);
    });

    /* Not dismissable: the only way to make it go is to finish it. */
    it("has nothing to show once all four are done", () => {
        expect(
            pendingSetup(
                facts(
                    { logCount: 1, friendCount: 1 },
                    { avatarUrl: "a", bio: "b" }
                )
            )
        ).toBeNull();
    });

    /* A finished account would otherwise flash the list while its counts
       load. */
    it("waits for the counts before deciding", () => {
        expect(pendingSetup(facts({ logCount: undefined }))).toBeNull();
        expect(pendingSetup(facts({ friendCount: undefined }))).toBeNull();
    });
});

import { describe, expect, it } from "vitest";
import { setupSteps, unfinished } from "./setupChecklist";

const facts = (
    overrides: Partial<Parameters<typeof setupSteps>[0]> = {},
    profile: Partial<Parameters<typeof setupSteps>[0]["profile"]> = {}
) => ({
    profile: { avatarUrl: null, bio: "", ...profile },
    logCount: 0,
    friendCount: 0,
    ...overrides,
});

const steps = (f = facts()) => setupSteps(f)!;

const done = (f: ReturnType<typeof facts>) =>
    Object.fromEntries(steps(f).map((s) => [s.key, s.done]));

const allDone = facts(
    { logCount: 1, friendCount: 1 },
    { avatarUrl: "a", bio: "b" }
);

describe("setupSteps", () => {
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

    /* Judging on a guess would flash the menu row at a finished account. */
    it("waits for the counts before deciding", () => {
        expect(setupSteps(facts({ logCount: undefined }))).toBeNull();
        expect(setupSteps(facts({ friendCount: undefined }))).toBeNull();
    });
});

describe("unfinished", () => {
    it("keeps the list while anything is left", () => {
        expect(unfinished(steps())).toHaveLength(4);
    });

    /* Not dismissable: finishing it is the only way it goes. */
    it("has nothing once all four are done", () => {
        expect(unfinished(steps(allDone))).toBeNull();
        expect(unfinished(null)).toBeNull();
    });
});

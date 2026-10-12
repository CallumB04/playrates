import { describe, expect, it } from "vitest";
import { setupMessage, setupSteps, unfinished } from "./setupChecklist";

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

    /* Judging on a guess would toast, or flash the menu row, wrongly. */
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

describe("setupMessage", () => {
    it("says which step was done and where that leaves them", () => {
        expect(setupMessage(steps(), steps(facts({}, { bio: "Hello" })))).toBe(
            "Bio written. Get started: 1 of 4 done."
        );
    });

    it("counts rather than names two steps done at once", () => {
        expect(
            setupMessage(
                steps(),
                steps(facts({}, { bio: "Hello", avatarUrl: "a" }))
            )
        ).toBe("2 steps done. Get started: 2 of 4 done.");
    });

    it("says it is all done on the last one", () => {
        const threeDone = facts(
            { logCount: 1, friendCount: 0 },
            { avatarUrl: "a", bio: "b" }
        );
        expect(setupMessage(steps(threeDone), steps(allDone))).toBe(
            "You're all set! Every Get started step is done."
        );
    });

    /* Deleting the only log un-ticks a step; that is not news. */
    it("says nothing when nothing new is done", () => {
        expect(setupMessage(steps(), steps())).toBeNull();
        expect(setupMessage(steps(facts({ logCount: 1 })), steps())).toBeNull();
    });
});

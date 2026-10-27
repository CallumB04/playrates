import { describe, expect, it } from "vitest";
import { setupSteps, unfinished } from "./setupChecklist";

const facts = (
    overrides: Partial<Parameters<typeof setupSteps>[0]> = {},
    profile: Partial<Parameters<typeof setupSteps>[0]["profile"]> = {}
) => ({
    profile: { username: "devuser", avatarUrl: null, bio: "", ...profile },
    logCount: 0,
    reviewCount: 0,
    friendCount: 0,
    postCount: 0,
    ...overrides,
});

const steps = (f = facts()) => setupSteps(f)!;

const done = (f: ReturnType<typeof facts>) =>
    Object.fromEntries(steps(f).map((s) => [s.key, s.done]));

const allDone = facts(
    { logCount: 1, reviewCount: 1, friendCount: 1, postCount: 1 },
    { avatarUrl: "a", bio: "b" }
);

describe("setupSteps", () => {
    it("starts a new account on nothing done", () => {
        expect(done(facts())).toEqual({
            picture: false,
            bio: false,
            log: false,
            review: false,
            friend: false,
            post: false,
        });
    });

    it("ticks each step off from what the account holds", () => {
        expect(
            done(
                facts(
                    { logCount: 3, postCount: 2 },
                    { avatarUrl: "https://x.test/a.webp" }
                )
            )
        ).toEqual({
            picture: true,
            bio: false,
            log: true,
            review: false,
            friend: false,
            post: true,
        });
    });

    /* A review hangs off a log, and their played shelf is where those are. */
    it("sends a first review to their own played shelf", () => {
        expect(steps().find((s) => s.key === "review")?.to).toBe(
            "/user/devuser/games?type=played"
        );
    });

    it("does not count a bio of spaces", () => {
        expect(done(facts({}, { bio: "   " })).bio).toBe(false);
    });

    /* Judging on a guess would flash the menu row at a finished account. */
    it("waits for the counts before deciding", () => {
        for (const count of [
            "logCount",
            "reviewCount",
            "friendCount",
            "postCount",
        ] as const) {
            expect(setupSteps(facts({ [count]: undefined }))).toBeNull();
        }
    });
});

describe("unfinished", () => {
    it("keeps the list while anything is left", () => {
        expect(unfinished(steps())).toHaveLength(6);
    });

    /* Not dismissable: finishing it is the only way it goes. */
    it("has nothing once all four are done", () => {
        expect(unfinished(steps(allDone))).toBeNull();
        expect(unfinished(null)).toBeNull();
    });
});

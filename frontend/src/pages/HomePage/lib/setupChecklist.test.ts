import { describe, expect, it } from "vitest";
import { setupSteps, showSetupChecklist } from "./setupChecklist";

const facts = (
    overrides: Partial<Parameters<typeof setupSteps>[0]> = {},
    profile: Partial<Parameters<typeof setupSteps>[0]["profile"]> = {}
) => ({
    profile: {
        avatarUrl: null,
        bio: "",
        checklistDismissedAt: null,
        ...profile,
    },
    logCount: 0,
    friendCount: 0,
    ...overrides,
});

const done = (f: ReturnType<typeof facts>) =>
    Object.fromEntries(setupSteps(f).map((s) => [s.key, s.done]));

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
            done(
                facts(
                    { logCount: 3, friendCount: 1 },
                    { avatarUrl: "https://x.test/a.webp", bio: "Hi" }
                )
            )
        ).toEqual({ picture: true, bio: true, log: true, friend: true });
    });

    it("does not count a bio of spaces", () => {
        expect(done(facts({}, { bio: "   " })).bio).toBe(false);
    });
});

describe("showSetupChecklist", () => {
    const show = (f: ReturnType<typeof facts>) =>
        showSetupChecklist(f, setupSteps(f));

    it("shows while anything is left", () => {
        expect(show(facts({ logCount: 2 }))).toBe(true);
    });

    it("goes once everything is done", () => {
        expect(
            show(
                facts(
                    { logCount: 1, friendCount: 1 },
                    { avatarUrl: "a", bio: "b" }
                )
            )
        ).toBe(false);
    });

    it("goes once put away, finished or not", () => {
        expect(
            show(facts({}, { checklistDismissedAt: "2026-10-12T10:00:00Z" }))
        ).toBe(false);
    });

    /* A finished account would otherwise flash the list while its counts
       load. */
    it("waits for the counts before deciding", () => {
        expect(show(facts({ logCount: undefined }))).toBe(false);
        expect(show(facts({ friendCount: undefined }))).toBe(false);
    });
});

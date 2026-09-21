import { describe, expect, it } from "vitest";
import {
    achievementFraction,
    emptyDraft,
    logReducer,
    toGameLogInput,
    validateDraft,
    type LogDraft,
} from "./logEditorReducer";

const draft = (overrides: Partial<LogDraft> = {}): LogDraft => ({
    ...emptyDraft,
    ...overrides,
});

describe("logReducer", () => {
    it("clears the substatus when the status can no longer carry one", () => {
        const played = draft({ status: "played", playedStatus: "mastered" });
        const next = logReducer(played, { type: "status", value: "backlog" });

        expect(next.status).toBe("backlog");
        expect(next.playedStatus).toBeNull();
    });

    it("keeps the substatus while the log stays played", () => {
        const played = draft({ status: "played", playedStatus: "mastered" });
        const next = logReducer(played, { type: "status", value: "played" });
        expect(next.playedStatus).toBe("mastered");
    });

    it("hydrates from an existing log and its review", () => {
        const next = logReducer(emptyDraft, {
            type: "hydrate",
            log: {
                id: 1,
                gameId: 7,
                status: "played",
                playedStatus: "finished",
                rating: 8.25,
                hoursPlayed: 52.5,
                hoursToBeat: null,
                startDate: "2026-01-02",
                finishDate: null,
                platform: "steam",
                achievementsTotal: 52,
                achievementsCompleted: 46,
                createdAt: "",
                updatedAt: "",
                game: null,
            },
            review: { body: "Good.", isPublic: false },
        });

        expect(next).toMatchObject({
            status: "played",
            playedStatus: "finished",
            rating: 8.25,
            hoursPlayed: "52.5",
            hoursToBeat: "",
            startDate: "2026-01-02",
            finishDate: "",
            platform: "steam",
            reviewBody: "Good.",
            reviewIsPublic: false,
        });
    });

    it("hydrating a brand-new log keeps any review already written", () => {
        const next = logReducer(draft({ hoursPlayed: "99" }), {
            type: "hydrate",
            log: null,
            review: { body: "Draft note", isPublic: true },
        });
        expect(next.hoursPlayed).toBe("");
        expect(next.reviewBody).toBe("Draft note");
    });
});

describe("toGameLogInput", () => {
    it("turns blank fields into nulls rather than zeroes", () => {
        const input = toGameLogInput(draft({ status: "backlog" }));

        expect(input).toMatchObject({
            status: "backlog",
            hoursPlayed: null,
            hoursToBeat: null,
            startDate: null,
            finishDate: null,
            platform: null,
            achievementsCompleted: null,
            achievementsTotal: null,
        });
    });

    it("drops a substatus the status cannot carry", () => {
        const input = toGameLogInput(
            draft({ status: "wishlist", playedStatus: "mastered" })
        );
        expect(input.playedStatus).toBeNull();
    });

    it("keeps a zero, which is a real value", () => {
        const input = toGameLogInput(draft({ hoursPlayed: "0", rating: 0 }));
        expect(input.hoursPlayed).toBe(0);
        expect(input.rating).toBe(0);
    });

    it("rejects a half-typed date rather than sending it", () => {
        const input = toGameLogInput(draft({ startDate: "2026-01" }));
        expect(input.startDate).toBeNull();
    });
});

describe("validateDraft", () => {
    it("catches more achievements completed than exist", () => {
        expect(
            validateDraft(
                draft({ achievementsCompleted: "60", achievementsTotal: "52" })
            )
        ).toMatch(/exceed/i);
    });

    it("catches a finish date before the start", () => {
        expect(
            validateDraft(
                draft({ startDate: "2026-02-11", finishDate: "2026-01-02" })
            )
        ).toMatch(/before/i);
    });

    it("passes a coherent draft, and one with the fields left blank", () => {
        expect(
            validateDraft(
                draft({
                    achievementsCompleted: "46",
                    achievementsTotal: "52",
                    startDate: "2026-01-02",
                    finishDate: "2026-02-11",
                })
            )
        ).toBeNull();
        expect(validateDraft(emptyDraft)).toBeNull();
    });
});

describe("achievementFraction", () => {
    it("is the completed share of the total", () => {
        expect(
            achievementFraction(
                draft({ achievementsCompleted: "46", achievementsTotal: "52" })
            )
        ).toBeCloseTo(0.8846, 3);
    });

    it("is null without both halves, and never divides by zero", () => {
        expect(
            achievementFraction(draft({ achievementsTotal: "52" }))
        ).toBeNull();
        expect(
            achievementFraction(
                draft({ achievementsCompleted: "5", achievementsTotal: "0" })
            )
        ).toBeNull();
    });
});

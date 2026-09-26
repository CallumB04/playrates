import { describe, expect, it } from "vitest";
import type { RawgUsage } from "@playrates/shared";
import { allowanceTone } from "./gamePresentation";

const usage = (overrides: Partial<RawgUsage>): RawgUsage => ({
    allowance: 20_000,
    periodStart: "2026-09-08",
    resetsOn: "2026-10-08",
    daysLeft: 12,
    used: 1_000,
    left: 19_000,
    basis: "corrected",
    since: "2026-09-26",
    dailyBudget: 1_583,
    pace: 50,
    projectedLeft: 18_400,
    runsOutOn: null,
    periodFailures: 0,
    days: [],
    lastRequestAt: null,
    lastFailureAt: null,
    lastError: null,
    ...overrides,
});

describe("allowanceTone", () => {
    it("is calm while there's plenty left and it lasts to the reset", () => {
        expect(allowanceTone(usage({}))).toBe("ok");
    });

    it("warns once under a quarter is left", () => {
        expect(allowanceTone(usage({ left: 4_000 }))).toBe("warning");
    });

    it("alarms when this pace runs it out before the reset, however much is left", () => {
        expect(allowanceTone(usage({ left: 6_554, runsOutOn: "2026-10-05" }))).toBe("danger");
    });
});

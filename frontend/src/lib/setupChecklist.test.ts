import { describe, expect, it } from "vitest";
import { SETUP_STEPS, type SetupStepKey } from "@playrates/shared";
import { setupSteps, unfinished } from "./setupChecklist";

const none = Object.fromEntries(SETUP_STEPS.map((k) => [k, false])) as Record<
    SetupStepKey,
    boolean
>;
const all = Object.fromEntries(SETUP_STEPS.map((k) => [k, true])) as Record<
    SetupStepKey,
    boolean
>;

const steps = (done = none) => setupSteps("devuser", done)!;

describe("setupSteps", () => {
    it("lists every step in order, ticked as the server says", () => {
        const list = steps({ ...none, log: true, post: true });
        expect(list.map((s) => s.key)).toEqual([...SETUP_STEPS]);
        expect(list.filter((s) => s.done).map((s) => s.key)).toEqual([
            "log",
            "post",
        ]);
    });

    /* A rating and a review hang off a log, and the played shelf is where those are. */
    it("sends a rating and a first review to their own played shelf", () => {
        for (const key of ["rate", "review"]) {
            expect(steps().find((s) => s.key === key)?.to).toBe(
                "/user/devuser/games?type=played"
            );
        }
    });

    /* Judging on a guess would flash the menu row at a finished account. */
    it("waits for the answer before deciding", () => {
        expect(setupSteps("devuser", undefined)).toBeNull();
    });
});

describe("unfinished", () => {
    it("keeps the list while anything is left", () => {
        expect(unfinished(steps())).toHaveLength(SETUP_STEPS.length);
    });

    /* Not dismissable: finishing it is the only way it goes. */
    it("has nothing once every step is done", () => {
        expect(unfinished(steps(all))).toBeNull();
        expect(unfinished(null)).toBeNull();
    });
});

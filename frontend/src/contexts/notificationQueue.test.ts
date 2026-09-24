import { describe, expect, it } from "vitest";
import {
    DWELL_MS,
    MAX_VISIBLE,
    notificationQueue,
    type QueueAction,
    type Toast,
} from "./notificationQueue";

const push = (
    id: number,
    type: Toast["type"] = "success",
    severity?: Toast["severity"]
): QueueAction => ({ kind: "push", id, text: `toast ${id}`, type, severity });

const run = (actions: QueueAction[]): Toast[] =>
    actions.reduce(notificationQueue, [] as Toast[]);

const ids = (toasts: Toast[]) => toasts.map((toast) => toast.id);
const standing = (toasts: Toast[]) => toasts.filter((t) => !t.leaving);

describe("notificationQueue", () => {
    it("keeps the newest toast at the end", () => {
        expect(ids(run([push(1), push(2), push(3)]))).toEqual([1, 2, 3]);
    });

    it("takes its dwell from severity, not type", () => {
        const [quiet, loud] = run([
            push(1, "error", "low"),
            push(2, "success", "high"),
        ]);

        expect(quiet.dwell).toBe(DWELL_MS.low);
        expect(loud.dwell).toBe(DWELL_MS.high);
    });

    it("defaults errors to a longer dwell than successes", () => {
        const [ok, bad] = run([push(1, "success"), push(2, "error")]);

        expect(bad.dwell).toBeGreaterThan(ok.dwell!);
    });

    it("gives a critical toast no dwell at all", () => {
        expect(run([push(1, "error", "critical")])[0].dwell).toBeNull();
    });

    it("crowds out the oldest once the stack is full", () => {
        const state = run([push(1), push(2), push(3), push(4)]);

        expect(ids(standing(state))).toEqual([2, 3, 4]);
        expect(state.find((toast) => toast.id === 1)?.leaving).toBe(true);
    });

    it("never shows more than the maximum", () => {
        const state = run([1, 2, 3, 4, 5, 6].map((id) => push(id)));

        expect(standing(state)).toHaveLength(MAX_VISIBLE);
    });

    it("skips past a critical toast to crowd out an expiring one", () => {
        const state = run([
            push(1, "error", "critical"),
            push(2),
            push(3),
            push(4),
        ]);

        expect(ids(standing(state))).toEqual([1, 3, 4]);
    });

    it("crowds out a critical toast only when they all are", () => {
        const critical = (id: number) => push(id, "error", "critical");
        const state = run([critical(1), critical(2), critical(3), critical(4)]);

        expect(ids(standing(state))).toEqual([2, 3, 4]);
    });

    it("never crowds out the toast that just arrived", () => {
        const state = run([
            push(1),
            push(2),
            push(3),
            push(4, "error", "critical"),
        ]);

        expect(state.find((toast) => toast.id === 4)?.leaving).toBe(false);
    });

    it("leaves a dismissed toast mounted so it can play its exit", () => {
        const state = notificationQueue(run([push(1)]), {
            kind: "dismiss",
            id: 1,
        });

        expect(state).toHaveLength(1);
        expect(state[0].leaving).toBe(true);
    });

    it("frees the slot as soon as a toast starts leaving", () => {
        const full = run([push(1), push(2), push(3)]);
        const dismissed = notificationQueue(full, { kind: "dismiss", id: 2 });
        const state = notificationQueue(dismissed, push(4));

        expect(ids(standing(state))).toEqual([1, 3, 4]);
    });

    it("drops a toast on remove", () => {
        const state = notificationQueue(run([push(1), push(2)]), {
            kind: "remove",
            id: 1,
        });

        expect(ids(state)).toEqual([2]);
    });
});

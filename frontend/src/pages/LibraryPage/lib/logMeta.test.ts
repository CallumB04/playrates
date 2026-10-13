import { describe, expect, it } from "vitest";
import { logMeta } from "./logMeta";

const logs = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ id: i })) as never;

describe("logMeta", () => {
    it("says nothing for a game you have not logged", () => {
        expect(logMeta(undefined)).toBeUndefined();
    });

    /* A phone cuts the line short; the rating is what survives. */
    it("leads with the rating", () => {
        expect(logMeta({ logs: logs(3), rating: 9.25 })).toBe(
            "9.25/10 · Your logs · 3 platforms"
        );
        expect(logMeta({ logs: logs(1), rating: 8.5 })).toBe(
            "8.50/10 · Your log"
        );
    });

    it("leaves the rating out when there is none", () => {
        expect(logMeta({ logs: logs(1), rating: null })).toBe("Your log");
    });
});

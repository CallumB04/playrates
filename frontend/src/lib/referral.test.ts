import { beforeEach, describe, expect, it, vi } from "vitest";
import { captureReferral, clearReferral, pendingReferral } from "./referral";

const DAY = 24 * 60 * 60 * 1000;

// jsdom under Node 26 doesn't always provide one.
const memory = new Map<string, string>();
vi.stubGlobal("localStorage", {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => void memory.set(key, value),
    removeItem: (key: string) => void memory.delete(key),
    clear: () => memory.clear(),
});

beforeEach(() => memory.clear());

describe("referrals", () => {
    it("remembers who invited the visitor", () => {
        captureReferral("?ref=callum&x=1", 1000);
        expect(pendingReferral(2000)).toBe("callum");
    });

    it("ignores an address with no invite, or a bad one", () => {
        captureReferral("?x=1");
        captureReferral("?ref=not%20a%20name");
        expect(pendingReferral()).toBeNull();
    });

    it("forgets an invite after 30 days", () => {
        captureReferral("?ref=callum", 0);
        expect(pendingReferral(29 * DAY)).toBe("callum");
        expect(pendingReferral(31 * DAY)).toBeNull();
        expect(localStorage.getItem("pr_ref")).toBeNull();
    });

    it("clears once claimed", () => {
        captureReferral("?ref=callum");
        clearReferral();
        expect(pendingReferral()).toBeNull();
    });
});

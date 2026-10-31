import { describe, expect, it } from "vitest";
import { signedInAt, signedInRecently } from "./recentSignIn";

const token = (payload: object) =>
    `header.${btoa(JSON.stringify(payload)).replace(/=+$/, "")}.signature`;

const NOW = Date.UTC(2026, 10, 1, 12);

describe("signedInAt", () => {
    it("takes the latest way the session was proved", () => {
        const at = signedInAt(
            token({
                amr: [
                    { method: "password", timestamp: NOW / 1000 - 3600 },
                    { method: "oauth", timestamp: NOW / 1000 - 60 },
                ],
            })
        );
        expect(at).toBe(NOW - 60_000);
    });

    it("is null for a token with no amr, or no token at all", () => {
        expect(signedInAt(token({ sub: "x" }))).toBeNull();
        expect(signedInAt("not-a-jwt")).toBeNull();
    });
});

describe("signedInRecently", () => {
    it("counts a sign-in from minutes ago, not one from an hour ago", () => {
        const minutesAgo = token({
            amr: [{ method: "password", timestamp: NOW / 1000 - 300 }],
        });
        const hourAgo = token({
            amr: [{ method: "password", timestamp: NOW / 1000 - 3600 }],
        });
        expect(signedInRecently(minutesAgo, NOW)).toBe(true);
        expect(signedInRecently(hourAgo, NOW)).toBe(false);
        expect(signedInRecently(undefined, NOW)).toBe(false);
    });
});

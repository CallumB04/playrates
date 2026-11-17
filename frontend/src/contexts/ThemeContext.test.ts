import { afterEach, describe, expect, it } from "vitest";
import { hasStoredSession, resolveTheme } from "./ThemeContext";

afterEach(() => window.localStorage.clear());

describe("resolveTheme", () => {
    it("is always dark for someone signed out, whatever was chosen", () => {
        expect(resolveTheme("light", "light", false)).toBe("dark");
        expect(resolveTheme("system", "light", false)).toBe("dark");
    });

    it("follows a member's choice, or their system's", () => {
        expect(resolveTheme("light", "dark", true)).toBe("light");
        expect(resolveTheme("system", "light", true)).toBe("light");
        expect(resolveTheme("dark", "light", true)).toBe("dark");
    });
});

describe("hasStoredSession", () => {
    it("knows a kept Supabase session from other storage", () => {
        window.localStorage.setItem("playrates-theme", "light");
        expect(hasStoredSession()).toBe(false);
        window.localStorage.setItem("sb-abc-auth-token", "{}");
        expect(hasStoredSession()).toBe(true);
    });
});

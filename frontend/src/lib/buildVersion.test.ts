import { describe, expect, it } from "vitest";
import { isStaleBuild } from "./buildVersion";

describe("isStaleBuild", () => {
    it("says so when the site serves a different build", () => {
        expect(isStaleBuild("abc", { id: "def" })).toBe(true);
    });

    it("says no when the tab is running the current build", () => {
        expect(isStaleBuild("abc", { id: "abc" })).toBe(false);
    });

    /* A 404 page, a proxy's HTML or a half-written file must not send every
       open tab into a reload. */
    it("says no to anything that is not a version file", () => {
        expect(isStaleBuild("abc", null)).toBe(false);
        expect(isStaleBuild("abc", "<html>")).toBe(false);
        expect(isStaleBuild("abc", {})).toBe(false);
        expect(isStaleBuild("abc", { id: 42 })).toBe(false);
    });
});

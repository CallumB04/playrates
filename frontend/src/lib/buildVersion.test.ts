import { afterEach, describe, expect, it, vi } from "vitest";
import { isStaleBuild, siteHasNewerBuild } from "./buildVersion";

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

describe("siteHasNewerBuild", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    const serving = (body: unknown, ok = true) =>
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({ ok, json: async () => body })
        );

    // The dev server has no version file, and rebuilds on every save.
    it("never asks in development", async () => {
        vi.stubEnv("PROD", false);
        const fetch = vi.fn();
        vi.stubGlobal("fetch", fetch);
        expect(await siteHasNewerBuild()).toBe(false);
        expect(fetch).not.toHaveBeenCalled();
    });

    it("says so when the site serves another build", async () => {
        vi.stubEnv("PROD", true);
        serving({ id: "a-later-one" });
        expect(await siteHasNewerBuild()).toBe(true);
    });

    it("says no when the site serves this one", async () => {
        vi.stubEnv("PROD", true);
        serving({ id: "test" });
        expect(await siteHasNewerBuild()).toBe(false);
    });

    /* A failed check must never reload a page. */
    it("says no when the file is missing or the network fails", async () => {
        vi.stubEnv("PROD", true);
        serving(null, false);
        expect(await siteHasNewerBuild()).toBe(false);

        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
        expect(await siteHasNewerBuild()).toBe(false);
    });
});

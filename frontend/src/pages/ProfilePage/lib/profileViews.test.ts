import { describe, expect, it } from "vitest";
import { isLegacyShelfSearch, parseProfileTab } from "./profileViews";

describe("parseProfileTab", () => {
    it("reads no segment as the profile itself", () => {
        expect(parseProfileTab(undefined)).toBe("profile");
    });

    it("knows each view", () => {
        for (const view of ["games", "posts", "friends"]) {
            expect(parseProfileTab(view)).toBe(view);
        }
    });

    it("refuses a view that doesn't exist, the profile's own name included", () => {
        expect(parseProfileTab("lists")).toBeNull();
        expect(parseProfileTab("profile")).toBeNull();
    });
});

describe("isLegacyShelfSearch", () => {
    it("spots an old shelf link by any of its parameters", () => {
        expect(isLegacyShelfSearch("?type=backlog")).toBe(true);
        expect(isLegacyShelfSearch("?sort=title&direction=asc")).toBe(true);
        expect(isLegacyShelfSearch("?ending=completed")).toBe(true);
        expect(isLegacyShelfSearch("?page=2")).toBe(true);
    });

    it("leaves a bare profile, and a log deep link, where they are", () => {
        expect(isLegacyShelfSearch("")).toBe(false);
        expect(isLegacyShelfSearch("?log=12")).toBe(false);
    });
});

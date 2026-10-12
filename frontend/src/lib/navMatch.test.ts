import { describe, expect, it } from "vitest";
import { isCurrent } from "./navMatch";

describe("isCurrent", () => {
    it("matches home only exactly, so every page is not also Home", () => {
        expect(isCurrent("/", true, "/", "")).toBe(true);
        expect(isCurrent("/", true, "/library", "")).toBe(false);
    });

    it("matches a section and the pages under it", () => {
        expect(isCurrent("/community", false, "/community", "")).toBe(true);
        expect(isCurrent("/community", false, "/community/thread/4", "")).toBe(
            true
        );
        expect(isCurrent("/community", false, "/communityx", "")).toBe(false);
    });

    it("needs the link's query to match where it has one", () => {
        expect(
            isCurrent("/user/a?type=backlog", true, "/user/a", "?type=backlog")
        ).toBe(true);
        expect(
            isCurrent("/user/a?type=backlog", true, "/user/a", "?type=played")
        ).toBe(false);
        expect(isCurrent("/user/a", true, "/user/a", "?type=played")).toBe(
            true
        );
    });
});

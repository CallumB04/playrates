import { describe, expect, it } from "vitest";
import {
    aboutError,
    linkLabel,
    moveItem,
    podiumOnPhone,
    rankTone,
    steamLabel,
} from "./about";

describe("linkLabel", () => {
    it("reads an address without its scheme, www or trailing slash", () => {
        expect(linkLabel("https://www.example.com/me/")).toBe("example.com/me");
        expect(linkLabel("http://blog.example.com")).toBe("blog.example.com");
    });
});

describe("steamLabel", () => {
    it("names a profile by its custom name", () => {
        expect(steamLabel("https://steamcommunity.com/id/gaben")).toBe("gaben");
    });

    it("falls back for a numbered one", () => {
        expect(
            steamLabel("https://steamcommunity.com/profiles/76561197960287930")
        ).toBe("Steam profile");
    });
});

describe("moveItem", () => {
    it("moves one item, keeping the rest in order", () => {
        expect(moveItem(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
        expect(moveItem(["a", "b", "c"], 2, 1)).toEqual(["a", "c", "b"]);
    });

    it("leaves the list alone past either end", () => {
        const list = ["a", "b"];
        expect(moveItem(list, 0, -1)).toBe(list);
        expect(moveItem(list, 1, 2)).toBe(list);
    });
});

describe("rankTone", () => {
    it("gives the top three their medals and leaves the rest plain", () => {
        expect([1, 2, 3, 4, 5].map(rankTone)).toEqual([
            "text-medal-gold",
            "text-medal-silver",
            "text-medal-bronze",
            "text-content-muted",
            "text-content-muted",
        ]);
    });
});

describe("podiumOnPhone", () => {
    it("keeps the top three on a phone and hides the rest there", () => {
        expect([1, 2, 3, 4, 5].map(podiumOnPhone)).toEqual([
            undefined,
            undefined,
            undefined,
            "max-sm:hidden",
            "max-sm:hidden",
        ]);
    });
});

describe("aboutError", () => {
    it("holds each field to the server's rule, and lets an empty one go", () => {
        expect(aboutError("website", "callum.dev")).toBeTruthy();
        expect(aboutError("website", "https://callum.dev")).toBeUndefined();
        expect(aboutError("discord", "")).toBeUndefined();
    });

    it("keeps a first name to 40 characters", () => {
        expect(aboutError("firstName", "a".repeat(41))).toBe(
            "40 characters at most"
        );
        expect(aboutError("firstName", "Callum")).toBeUndefined();
    });
});

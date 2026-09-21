import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { render } from "@testing-library/react";
import { Gamepad2 } from "lucide-react";
import { getPlatformIcon, getStatusIcon } from "./icons";
import { platformIcon, platformOptions } from "./platformIcons";
import { genreIcon } from "./genreIcons";

describe("getPlatformIcon", () => {
    it("gives a distinct mark to the platforms that have one", () => {
        expect(getPlatformIcon("steam")).not.toBe(Gamepad2);
        expect(getPlatformIcon("playstation")).not.toBe(Gamepad2);
    });

    it("falls back to a controller for a slug it has never seen", () => {
        expect(getPlatformIcon("dreamcast")).toBe(Gamepad2);
        expect(getPlatformIcon("")).toBe(Gamepad2);
    });
});

describe("getStatusIcon", () => {
    it("covers every game log status", () => {
        for (const status of ["played", "playing", "backlog", "wishlist"]) {
            expect(getStatusIcon(status)).toBeDefined();
        }
    });

    it("returns undefined rather than a wrong icon for a non-status", () => {
        expect(getStatusIcon("mastered")).toBeUndefined();
    });
});

describe("platformIcon", () => {
    it("gives every slug the API returns its own mark", () => {
        const slugs = [
            "steam",
            "playstation",
            "xbox",
            "nintendo-switch",
            "pc-game-pass",
            "other-pc",
            "mobile",
        ];
        const marks = new Set(slugs.map(platformIcon));
        expect(marks.size).toBe(slugs.length);
    });

    it("falls back to a controller for an unknown slug", () => {
        expect(platformIcon("stadia")).toBe(Gamepad2);
    });
});

describe("platformOptions", () => {
    const platforms = [
        { slug: "steam", displayName: "Steam" },
        { slug: "xbox", displayName: "Xbox" },
    ];

    it("maps each platform to a value, label and mark", () => {
        expect(platformOptions(platforms)).toEqual([
            { value: "steam", label: "Steam", icon: platformIcon("steam") },
            { value: "xbox", label: "Xbox", icon: platformIcon("xbox") },
        ]);
    });

    it("prepends an empty option when one is asked for", () => {
        const options = platformOptions(platforms, "All platforms");
        expect(options[0]).toEqual({ value: "", label: "All platforms" });
        expect(options).toHaveLength(3);
    });

    it("returns nothing at all for an empty list and no empty label", () => {
        expect(platformOptions([])).toEqual([]);
    });
});

describe("platform marks render", () => {
    /* The Xbox and Switch marks are inlined SVGs rather than imports, so they
       only break at render time. */
    it.each([
        ["steam"],
        ["playstation"],
        ["xbox"],
        ["nintendo-switch"],
        ["pc-game-pass"],
        ["other-pc"],
        ["mobile"],
        ["stadia"],
    ])("draws an svg for %s", (slug) => {
        const { container } = render(
            createElement(platformIcon(slug), { size: 24 })
        );
        const svg = container.querySelector("svg");
        expect(svg).not.toBeNull();
        expect(svg).toHaveAttribute("width", "24");
    });

    it("defaults to 16px when no size is given", () => {
        const { container } = render(createElement(platformIcon("xbox")));
        expect(container.querySelector("svg")).toHaveAttribute("width", "16");
    });
});

describe("genreIcon", () => {
    it("gives a known genre a mark of its own", () => {
        expect(genreIcon("action")).not.toBe(Gamepad2);
        expect(genreIcon("puzzle")).not.toBe(Gamepad2);
    });

    it("maps both RPG slugs RAWG uses to the same mark", () => {
        expect(genreIcon("rpg")).toBe(genreIcon("role-playing-games-rpg"));
    });

    it("falls back to a controller so a new genre leaves no hole", () => {
        expect(genreIcon("visual-novel")).toBe(Gamepad2);
        expect(genreIcon("")).toBe(Gamepad2);
    });
});

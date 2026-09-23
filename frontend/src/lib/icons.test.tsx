import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { render } from "@testing-library/react";
import { Gamepad2 } from "lucide-react";
import { getStatusIcon } from "./icons";
import {
    platformIcon,
    platformOptions,
    systemIcon,
    systemOptions,
} from "./platformIcons";
import { genreIcon } from "./genreIcons";

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

/** Every family in supabase/migrations/20260109000000_platform_systems.sql. */
const FAMILIES = [
    "steam",
    "pc-game-pass",
    "other-pc",
    "playstation",
    "xbox",
    "nintendo-switch",
    "nintendo",
    "mobile",
    "mac",
    "linux",
    "web",
    "sega",
    "atari",
    "commodore-amiga",
    "neo-geo",
    "3do",
];

describe("platformIcon", () => {
    it("gives every family the API returns a mark of its own", () => {
        const marks = new Set(FAMILIES.map(platformIcon));
        expect(marks.size).toBe(FAMILIES.length);
    });

    it("never hands a family the unknown-platform fallback", () => {
        for (const slug of FAMILIES) {
            expect(platformIcon(slug)).not.toBe(Gamepad2);
        }
    });

    it("falls back to a controller for an unknown slug", () => {
        expect(platformIcon("stadia")).toBe(Gamepad2);
        expect(platformIcon("")).toBe(Gamepad2);
    });
});

describe("systemIcon", () => {
    it("gives the machines with a brand mark one of their own", () => {
        expect(systemIcon("playstation5", "playstation")).not.toBe(
            platformIcon("playstation")
        );
        expect(systemIcon("android", "mobile")).not.toBe(
            platformIcon("mobile")
        );
    });

    it("wears the family mark where the machine has none", () => {
        expect(systemIcon("genesis", "sega")).toBe(platformIcon("sega"));
        expect(systemIcon("nes", "nintendo")).toBe(platformIcon("nintendo"));
        expect(systemIcon("xbox360", "xbox")).toBe(platformIcon("xbox"));
    });

    it("falls back through an unknown family rather than throwing", () => {
        expect(systemIcon("virtual-boy", "nintendo-virtual")).toBe(Gamepad2);
    });
});

describe("systemOptions", () => {
    const systems = [
        {
            slug: "playstation5",
            displayName: "PlayStation 5",
            platformSlug: "playstation",
        },
        { slug: "nes", displayName: "NES", platformSlug: "nintendo" },
    ];

    it("maps each machine to a value, label and mark", () => {
        expect(systemOptions(systems)).toEqual([
            {
                value: "playstation5",
                label: "PlayStation 5",
                icon: systemIcon("playstation5", "playstation"),
            },
            {
                value: "nes",
                label: "NES",
                icon: systemIcon("nes", "nintendo"),
            },
        ]);
    });

    it("prepends an empty option when one is asked for", () => {
        expect(systemOptions(systems, "Not set")[0]).toEqual({
            value: "",
            label: "Not set",
        });
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
    it.each([...FAMILIES, "stadia"])("draws an svg for %s", (slug) => {
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

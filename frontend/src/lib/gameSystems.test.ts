import { describe, expect, it } from "vitest";
import type { PlatformSystem } from "@playrates/shared";
import {
    familyOf,
    playedOnName,
    remainingSystems,
    systemsForGame,
} from "./gameSystems";

const system = (
    slug: string,
    platformSlug: string,
    sortOrder = 10
): PlatformSystem => ({
    slug,
    displayName: slug,
    platformSlug,
    sortOrder,
});

const ALL = [
    system("steam", "steam"),
    system("playstation5", "playstation", 10),
    system("playstation3", "playstation", 30),
    system("xbox-series-x", "xbox"),
    system("nes", "nintendo"),
];

describe("systemsForGame", () => {
    it("offers only the machines the game is on", () => {
        const offered = systemsForGame(ALL, ["steam", "playstation5"]);
        expect(offered.map((s) => s.slug)).toEqual(["steam", "playstation5"]);
    });

    it("keeps catalogue order rather than the game's", () => {
        const offered = systemsForGame(ALL, ["playstation3", "steam"]);
        expect(offered.map((s) => s.slug)).toEqual(["steam", "playstation3"]);
    });

    it("offers everything for a game we hold no systems for", () => {
        expect(systemsForGame(ALL, [])).toEqual(ALL);
    });

    it("keeps a machine already recorded on the log", () => {
        const offered = systemsForGame(ALL, ["steam"], "playstation3");
        expect(offered.map((s) => s.slug)).toEqual(["steam", "playstation3"]);
    });

    it("ignores a selection the catalogue has never heard of", () => {
        const offered = systemsForGame(ALL, ["steam"], "dreamcast");
        expect(offered.map((s) => s.slug)).toEqual(["steam"]);
    });

    it("drops nothing when the game is on a machine we do not list", () => {
        expect(systemsForGame(ALL, ["stadia"])).toEqual([]);
    });
});

describe("familyOf", () => {
    it("finds the family a machine rolls up into", () => {
        expect(familyOf(ALL, "playstation5")).toBe("playstation");
        expect(familyOf(ALL, "nes")).toBe("nintendo");
    });

    it("returns null rather than guessing at an unknown machine", () => {
        expect(familyOf(ALL, "dreamcast")).toBeNull();
        expect(familyOf(ALL, "")).toBeNull();
    });
});

describe("remainingSystems", () => {
    it("leaves out the consoles already logged", () => {
        const free = remainingSystems(ALL, ["steam", "playstation5"]);
        expect(free.map((s) => s.slug)).not.toContain("steam");
        expect(free.map((s) => s.slug)).not.toContain("playstation5");
        expect(free.map((s) => s.slug)).toContain("playstation3");
    });

    /* A log with no console blocks nothing: another can still name one. */
    it("frees every console when the only log names none", () => {
        expect(remainingSystems(ALL, [null])).toHaveLength(ALL.length);
    });
});

describe("playedOnName", () => {
    const families = [{ slug: "playstation", displayName: "PlayStation" }];

    it("names the machine where the log has one", () => {
        expect(
            playedOnName(
                { system: "playstation3", platform: "playstation" },
                ALL,
                families
            )
        ).toBe("playstation3");
    });

    it("falls back to the family on a log from before machines", () => {
        expect(
            playedOnName(
                { system: null, platform: "playstation" },
                ALL,
                families
            )
        ).toBe("PlayStation");
    });

    it("has no name for a log that recorded neither", () => {
        expect(
            playedOnName({ system: null, platform: null }, ALL, families)
        ).toBeNull();
    });
});

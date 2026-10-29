import { describe, expect, it } from "vitest";
import { floatBeside, menuAcross } from "./popover";

describe("menuAcross", () => {
    const left = { left: 40, right: 140, width: 100 };
    const right = { left: 1100, right: 1200, width: 100 };

    it("matches the trigger's width when the menu has none of its own", () => {
        expect(menuAcross(right, 1280, false)).toEqual({
            left: 1100,
            width: 100,
        });
    });

    it("keeps the trigger's width as the least of a menu's own", () => {
        expect(menuAcross(left, 1280, true)).toEqual({
            left: 40,
            minWidth: 100,
        });
    });

    it("hangs a menu off the right edge of a trigger in the right half", () => {
        expect(menuAcross(right, 1280, true)).toEqual({
            right: 80,
            minWidth: 100,
        });
    });
});

describe("floatBeside", () => {
    const viewport = { width: 375, height: 800 };
    const panel = { width: 240, height: 200 };
    const at = (left: number, top: number) => ({
        left,
        right: left + 40,
        top,
        bottom: top + 30,
    });

    it("hangs below the anchor, from its start", () => {
        expect(floatBeside(at(20, 100), viewport, panel, "start")).toEqual({
            left: 20,
            top: 136,
        });
    });

    it("hangs from the anchor's end", () => {
        expect(floatBeside(at(300, 100), viewport, panel, "end")).toEqual({
            left: 100,
            top: 136,
        });
    });

    // On a phone a bar near the right edge would push it off the screen.
    it("stays inside the window", () => {
        expect(floatBeside(at(300, 100), viewport, panel, "start").left).toBe(
            127
        );
    });

    it("goes above when there isn't room below", () => {
        expect(floatBeside(at(20, 700), viewport, panel, "start").top).toBe(
            494
        );
    });
});

import { describe, expect, it } from "vitest";
import { menuAcross } from "./popover";

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

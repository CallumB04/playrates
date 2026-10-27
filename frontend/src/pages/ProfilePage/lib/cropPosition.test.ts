import { describe, expect, it } from "vitest";
import { backdropAspect, cropWindow, dragPosition } from "./cropPosition";

describe("backdropAspect", () => {
    it("divides the window's width by the backdrop's height there", () => {
        expect(backdropAspect(1200)).toBe(4);
        expect(backdropAspect(780)).toBe(3);
        expect(backdropAspect(400)).toBe(2);
    });
});

describe("cropWindow", () => {
    // A 16:9 picture under a 4:1 strip shows 4/9 of its height.
    const sixteenNine = 16 / 9;

    it("is as tall as the strip is, against the picture", () => {
        expect(cropWindow(0, sixteenNine, 4).height).toBeCloseTo(44.44, 1);
    });

    it("runs from the top of the picture to the bottom", () => {
        expect(cropWindow(0, sixteenNine, 4).top).toBe(0);
        const bottom = cropWindow(100, sixteenNine, 4);
        expect(bottom.top + bottom.height).toBeCloseTo(100);
        expect(cropWindow(50, sixteenNine, 4).top).toBeCloseTo(27.78, 1);
    });

    it("shows a picture no taller than the strip whole", () => {
        expect(cropWindow(70, 3, 2)).toEqual({ top: 0, height: 100 });
    });
});

describe("dragPosition", () => {
    // A 400-high picture with a window a quarter of it: 300 to move in.
    const drag = (start: number, dy: number) =>
        dragPosition({ start, dy, boxHeight: 400, windowHeight: 25 });

    it("follows the window down the picture", () => {
        expect(drag(0, 150)).toBe(50);
        expect(drag(50, 150)).toBe(100);
    });

    it("and back up it", () => {
        expect(drag(50, -30)).toBe(40);
    });

    it("stops at either edge", () => {
        expect(drag(90, 1000)).toBe(100);
        expect(drag(10, -1000)).toBe(0);
    });

    it("stays put when the window already covers the picture", () => {
        expect(
            dragPosition({
                start: 30,
                dy: 80,
                boxHeight: 400,
                windowHeight: 100,
            })
        ).toBe(30);
    });
});

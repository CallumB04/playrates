import { describe, expect, it } from "vitest";
import { coverHeight, dragPosition } from "./cropPosition";

describe("coverHeight", () => {
    it("scales the picture to the frame's width", () => {
        // A 16:9 picture in a frame 800 wide is 450 tall.
        expect(coverHeight(800, 1920, 1080)).toBe(450);
    });

    it("is nothing until the picture has loaded", () => {
        expect(coverHeight(800, 0, 0)).toBe(0);
    });
});

describe("dragPosition", () => {
    // A 200-high frame over a 450-high picture: 250 to spare.
    const drag = (start: number, dy: number) =>
        dragPosition({ start, dy, frameHeight: 200, imageHeight: 450 });

    it("shows more of the top as the picture is dragged down", () => {
        expect(drag(50, 125)).toBe(0);
        expect(drag(50, 25)).toBe(40);
    });

    it("shows more of the bottom as it is dragged up", () => {
        expect(drag(50, -125)).toBe(100);
    });

    it("stops at either edge of the picture", () => {
        expect(drag(10, 1000)).toBe(0);
        expect(drag(90, -1000)).toBe(100);
    });

    it("stays put when the whole picture already fits", () => {
        expect(
            dragPosition({
                start: 30,
                dy: 80,
                frameHeight: 200,
                imageHeight: 180,
            })
        ).toBe(30);
    });
});

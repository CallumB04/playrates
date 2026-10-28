import { afterEach, describe, expect, it, vi } from "vitest";
import { burst, tokenColours } from "./particles";

/** A 2D context that records what was drawn, as jsdom has none. */
const fakeCanvas = () => {
    const ctx = {
        clearRect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        fillRect: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        globalAlpha: 1,
        fillStyle: "",
    };
    const canvas = document.createElement("canvas");
    canvas.getContext = (() =>
        ctx) as unknown as HTMLCanvasElement["getContext"];
    return { canvas, ctx };
};

afterEach(() => vi.unstubAllGlobals());

describe("burst", () => {
    it("draws each piece every frame until the last has faded, then stops", () => {
        const frames: FrameRequestCallback[] = [];
        vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
            frames.push(cb);
            return frames.length;
        });
        vi.stubGlobal("cancelAnimationFrame", vi.fn());
        const { canvas, ctx } = fakeCanvas();

        burst(canvas, { colours: ["#fff", "#000"], count: 3 });
        frames.shift()!(0);
        expect(ctx.save).toHaveBeenCalledTimes(3);
        expect(ctx.fillRect.mock.calls.length + ctx.arc.mock.calls.length).toBe(
            3
        );

        // Each piece loses a little life a frame; well past it, all are gone.
        for (let i = 0; i < 200 && frames.length > 0; i++) frames.shift()!(0);
        expect(frames).toHaveLength(0);
    });

    it("stops early when asked, and clears what it drew", () => {
        vi.stubGlobal("requestAnimationFrame", () => 7);
        const cancel = vi.fn();
        vi.stubGlobal("cancelAnimationFrame", cancel);
        const { canvas, ctx } = fakeCanvas();

        const stop = burst(canvas, { colours: ["#fff"] });
        stop();
        expect(cancel).toHaveBeenCalledWith(7);
        expect(ctx.clearRect).toHaveBeenCalled();
    });

    it("does nothing without colours or a canvas to draw on", () => {
        const raf = vi.fn();
        vi.stubGlobal("requestAnimationFrame", raf);
        const { canvas } = fakeCanvas();
        burst(canvas, { colours: [] })();
        const blank = document.createElement("canvas");
        blank.getContext = (() =>
            null) as unknown as HTMLCanvasElement["getContext"];
        burst(blank, { colours: ["#fff"] })();
        expect(raf).not.toHaveBeenCalled();
    });
});

describe("tokenColours", () => {
    it("reads the named tokens, leaving out any the page doesn't set", () => {
        document.documentElement.style.setProperty("--test-a", " #123456 ");
        expect(tokenColours(["--test-a", "--test-missing"])).toEqual([
            "#123456",
        ]);
    });
});

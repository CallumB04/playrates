import { describe, expect, it } from "vitest";
import { exitMs } from "./motion";

describe("exitMs", () => {
    it("reads how long the element says it takes to leave", () => {
        const el = document.createElement("div");
        el.style.setProperty("--exit-ms", "145");
        document.body.append(el);
        expect(exitMs(el)).toBe(145);
    });

    it("lets something with no exit of its own go at once", () => {
        expect(exitMs(document.createElement("div"))).toBe(0);
        expect(exitMs(null)).toBe(0);
    });
});

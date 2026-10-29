import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import CoverGrid from "./CoverGrid";

const covers = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
        id: i + 1,
        title: `Game ${i + 1}`,
        coverUrl: `https://img/${i + 1}.jpg`,
    }));

const grid = (n: number) =>
    render(<CoverGrid covers={covers(n)} />).container.firstElementChild!;

describe("CoverGrid", () => {
    // A short list used to be mostly empty wells.
    it("fills the picture with however many there are", () => {
        expect(grid(1).children).toHaveLength(1);
        expect(grid(2).children).toHaveLength(2);
        expect(grid(3).children).toHaveLength(3);
        expect(grid(3).firstElementChild).toHaveClass("row-span-2");
    });

    it("draws the first four of a longer list, two by two", () => {
        const g = grid(6);
        expect(g.querySelectorAll("img")).toHaveLength(4);
        expect(g).toHaveClass("grid-cols-2", "grid-rows-2");
    });

    it("is one empty well for a list with nothing in it", () => {
        expect(grid(0).children).toHaveLength(1);
        expect(grid(0).querySelector("img")).toBeNull();
    });
});

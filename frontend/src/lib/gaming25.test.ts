import { describe, expect, it } from "vitest";
import { gridCells, inGridOrder, nextEmpty } from "./gaming25";

describe("gridCells", () => {
    it("is all 25, the picks in place and the centre marked", () => {
        const cells = gridCells([
            { category: "best_ending", game: "E" },
            { category: "all_time_favourite", game: "F" },
        ]);
        expect(cells).toHaveLength(25);
        expect(cells[12]).toMatchObject({
            category: "all_time_favourite",
            label: "Favourite game",
            game: "F",
            centre: true,
        });
        expect(cells[14].game).toBe("E");
        expect(cells.filter((c) => c.game === null)).toHaveLength(23);
        expect(cells.filter((c) => c.centre)).toHaveLength(1);
    });
});

describe("inGridOrder", () => {
    it("reads the picks across the grid", () => {
        expect(
            inGridOrder([
                { category: "best_indie" as const },
                { category: "childhood_classic" as const },
            ]).map((p) => p.category)
        ).toEqual(["childhood_classic", "best_indie"]);
    });
});

describe("nextEmpty", () => {
    it("is the next unfilled cell, reading on", () => {
        expect(nextEmpty(["best_soundtrack"], "overrated")).toBe(
            "hardest_game"
        );
    });

    it("comes round from the end to the start", () => {
        expect(nextEmpty([], "everyone_should_play")).toBe("childhood_classic");
    });

    it("is null when every other cell is filled", () => {
        const all = gridCells([]).map((c) => c.category);
        expect(nextEmpty(all, "best_story")).toBeNull();
        // Round to where it started, when that is all that's left.
        expect(
            nextEmpty(
                all.filter((c) => c !== "best_story"),
                "best_story"
            )
        ).toBe("best_story");
    });
});

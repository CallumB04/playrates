import { describe, expect, it } from "vitest";
import type { GameListEntry } from "@playrates/shared";
import { buildGame } from "../test/msw/handlers";
import { coversFor } from "./lists";

const entries: GameListEntry[] = [1, 2, 3, 4, 5].map((id, i) => ({
    game: buildGame({ id, title: `Game ${id}` }),
    rank: i + 1,
    addedAt: "2026-01-01T00:00:00Z",
}));
const ids = (covers: { id: number }[]) => covers.map((c) => c.id);

describe("coversFor", () => {
    it("is the first four with nothing picked", () => {
        expect(ids(coversFor([], entries))).toEqual([1, 2, 3, 4]);
    });

    it("puts the picks first and fills the rest in the list's order", () => {
        expect(ids(coversFor([5, 2], entries))).toEqual([5, 2, 1, 3]);
    });

    it("shows as many as the list has, under four", () => {
        expect(ids(coversFor([], entries.slice(0, 2)))).toEqual([1, 2]);
    });

    it("fills from the first added, not the first placed", () => {
        const reordered = entries
            .map((e, i) => ({
                ...e,
                rank: entries.length - i,
                addedAt: `2026-01-0${i + 1}T00:00:00Z`,
            }))
            .reverse();
        expect(ids(coversFor([], reordered))).toEqual([1, 2, 3, 4]);
    });
});

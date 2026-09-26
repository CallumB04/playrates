import { describe, expect, it } from "vitest";
import type { AdminGameEvent } from "@playrates/shared";
import { gameEventMark, gameEventSummary, quotaLevel } from "./gamePresentation";

const event = (overrides: Partial<AdminGameEvent>): AdminGameEvent => ({
    id: 1,
    kind: "game_added",
    group: "added",
    source: null,
    createdAt: "2026-09-26T10:00:00Z",
    game: { id: 4, title: "EA SPORTS FC 26", coverUrl: null, isTrending: false, rawgId: 99 },
    actorUsername: null,
    data: {},
    ...overrides,
});

describe("gameEventSummary", () => {
    it("names the game that arrived", () => {
        expect(gameEventSummary(event({}))).toEqual({
            title: "EA SPORTS FC 26",
            text: "arrived in the catalogue",
        });
    });

    it("tells a first cover from a replacement", () => {
        expect(gameEventSummary(event({ kind: "cover_updated", data: { hadOne: false } })).text).toBe("got its cover");
        expect(gameEventSummary(event({ kind: "cover_updated", data: { hadOne: true } })).text).toBe("got a new cover");
    });

    it("keeps the title the event recorded once the game is gone", () => {
        expect(gameEventSummary(event({ game: null, kind: "trending_set", data: { title: "Old Game" } })).title).toBe(
            "Old Game"
        );
    });

    it("says what a search brought back from RAWG", () => {
        expect(
            gameEventSummary(
                event({ kind: "search_pull", group: "pulls", game: null, data: { term: "fc 26", fetched: 20, added: 3 } })
            ).text
        ).toBe("A search for “fc 26” asked RAWG and brought back 20 games, 3 new");
    });

    it("gives the reason a backfill failed", () => {
        expect(
            gameEventSummary(event({ kind: "details_backfill_failed", data: { error: "RAWG responded 429" } })).text
        ).toBe("couldn’t fetch its details: RAWG responded 429");
    });
});

describe("gameEventMark", () => {
    it("marks a failed pull as a failure, whatever its kind", () => {
        expect(gameEventMark(event({ kind: "manual_pull", group: "pulls", data: { failed: true } }))?.label).toBe("Failed");
    });

    it("marks a game put on the trending rail in ember", () => {
        expect(gameEventMark(event({ kind: "trending_set", group: "controls" }))?.className).toBe("text-accent");
    });

    it("leaves ordinary arrivals alone", () => {
        expect(gameEventMark(event({}))).toBeNull();
    });
});

describe("quotaLevel", () => {
    it("warns at three quarters and alarms at nine tenths", () => {
        expect(quotaLevel(14_999, 20_000)).toBe("ok");
        expect(quotaLevel(15_000, 20_000)).toBe("warning");
        expect(quotaLevel(18_000, 20_000)).toBe("danger");
    });
});

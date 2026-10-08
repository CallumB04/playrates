import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
    GAME_LOG_SORTS,
    rollupLogs,
    type GameLog,
    type ShelfEntry,
} from "@playrates/shared";
import { directionLabel, shelfFoot, shelfSortOptions } from "./shelfSort";

/** A game on a shelf with one log, the log built from these overrides. */
const log = (overrides: Partial<GameLog> = {}): ShelfEntry => {
    const one: GameLog = {
        id: 1,
        gameId: 2,
        status: "played",
        playedStatus: null,
        rating: 8.5,
        hoursPlayed: null,
        hoursToBeat: null,
        startDate: null,
        finishDate: null,
        platform: null,
        system: null,
        achievementsTotal: null,
        achievementsCompleted: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-09-14T00:00:00.000Z",
        ...overrides,
    };
    return {
        gameId: 2,
        game: {
            id: 2,
            title: "Portal",
            slug: "portal",
            coverUrl: null,
            artworkUrl: null,
            releaseDate: "2007-10-09",
            platforms: [],
            avgRating: 9.25,
            criticScore: 90,
        },
        logs: [one],
        rollup: rollupLogs([one])!,
    };
};

describe("shelfSortOptions", () => {
    it("offers every sort the API accepts", () => {
        expect(
            shelfSortOptions(true)
                .map((s) => s.value)
                .sort()
        ).toEqual([...GAME_LOG_SORTS].sort());
    });

    it("words both directions for each, since none of them is 'ascending'", () => {
        for (const option of shelfSortOptions(true)) {
            expect(option.ascending, option.value).not.toBe("");
            expect(option.descending, option.value).not.toBe(option.ascending);
        }
    });

    /* The figure belongs to whoever's profile it is, and "Your rating" on
       someone else's shelf claims it is the viewer's. */
    it("calls the rating yours only on your own profile", () => {
        expect(shelfSortOptions(true)[0]!.label).toBe("Your rating");
        expect(shelfSortOptions(false)[0]!.label).toBe("User rating");
    });

    it("names the site's own average as the site's", () => {
        const average = shelfSortOptions(true).find(
            (s) => s.value === "gameRating"
        );
        expect(average?.label).toBe("PlayRates average");
    });
});

describe("directionLabel", () => {
    it("words the direction in the sort's own terms", () => {
        expect(directionLabel("title", "asc")).toBe("A to Z");
        expect(directionLabel("rating", "desc")).toBe("Highest first");
        expect(directionLabel("played", "desc")).toBe("Newest first");
    });
});

describe("shelfFoot", () => {
    it("shows your own rating by default", () => {
        expect(shelfFoot(log(), "rating")).toEqual({ rating: 8.5 });
    });

    it("shows the game's average when that is the order", () => {
        expect(shelfFoot(log(), "gameRating")).toEqual({ rating: 9.25 });
    });

    it("shows the critic score in its band's colour", () => {
        const { container } = render(<>{shelfFoot(log(), "critic").value}</>);
        expect(container.firstElementChild).toHaveTextContent("90");
        expect(container.firstElementChild).toHaveClass("bg-success-subtle");
    });

    /* "Sept", not "Sep" — en-GB's own abbreviation, and the same one
       formatReleaseShort already prints elsewhere. */
    it("shows a month and year for recently played", () => {
        const played = log({ startDate: "2026-09-14", finishDate: null });
        expect(shelfFoot(played, "played").value).toBe("Sept ’26");
    });

    /* The later of the two, and never updated_at — editing an old log must
       not make it look recently played. */
    it("reads recently played off the dates, not the row's timestamp", () => {
        const both = log({
            startDate: "2024-03-02",
            finishDate: "2024-06-11",
            updatedAt: "2026-09-14T00:00:00.000Z",
        });
        expect(shelfFoot(both, "played").value).toBe("Jun ’24");
    });

    it("falls back to whichever date the log actually has", () => {
        expect(
            shelfFoot(
                log({ startDate: "2021-02-01", finishDate: null }),
                "played"
            ).value
        ).toBe("Feb ’21");
        expect(
            shelfFoot(
                log({ startDate: null, finishDate: "2019-12-25" }),
                "played"
            ).value
        ).toBe("Dec ’19");
    });

    it("shows a dash for a log with neither date", () => {
        expect(
            shelfFoot(log({ startDate: null, finishDate: null }), "played")
                .value
        ).toBe("—");
    });

    it("shows a year alone for release date", () => {
        expect(shelfFoot(log(), "released").value).toBe("2007");
    });

    it("shows completion as a percentage", () => {
        const partly = log({
            achievementsTotal: 24,
            achievementsCompleted: 14,
        });
        expect(shelfFoot(partly, "completion").value).toBe("58%");
    });

    /* No achievements recorded is not nought per cent, and printing 0% would
       claim the opposite of what the log says. */
    it("shows a dash rather than 0% for a game with no achievements", () => {
        expect(shelfFoot(log(), "completion").value).toBe("—");
    });

    it("shows hours for time played and time to beat", () => {
        const timed = log({ hoursPlayed: 42.5, hoursToBeat: 30 });
        expect(shelfFoot(timed, "hoursPlayed").value).toBe("42.5h");
        expect(shelfFoot(timed, "hoursToBeat").value).toBe("30h");
    });

    it("shows a dash for a game with no hours logged", () => {
        expect(shelfFoot(log(), "hoursPlayed").value).toBe("—");
        expect(shelfFoot(log(), "hoursToBeat").value).toBe("—");
    });

    it("keeps the rating when sorting by title, which shows itself", () => {
        expect(shelfFoot(log(), "title")).toEqual({ rating: 8.5 });
    });

    it("copes with an entry whose game did not come back", () => {
        const orphan = { ...log(), game: null };
        expect(shelfFoot(orphan, "gameRating")).toEqual({ rating: null });
        expect(shelfFoot(orphan, "released").value).toBe("—");
    });

    it("gives every sort something to print", () => {
        for (const sort of GAME_LOG_SORTS) {
            const foot = shelfFoot(log(), sort);
            expect(
                foot.value !== undefined || foot.rating !== undefined,
                sort
            ).toBe(true);
        }
    });
});

/* A game on two consoles is one tile, showing what it was ordered by. */
describe("shelfFoot, a game logged on more than one console", () => {
    const both = (): ShelfEntry => {
        const first = log({
            rating: 9,
            finishDate: "2024-06-11",
            achievementsTotal: 10,
            achievementsCompleted: 5,
            hoursPlayed: 60,
            hoursToBeat: 45,
        });
        const second = log({
            rating: 7,
            startDate: "2026-02-01",
            achievementsTotal: 4,
            achievementsCompleted: 4,
            hoursPlayed: 25,
            hoursToBeat: 20,
        });
        const logs = [first.logs[0]!, { ...second.logs[0]!, id: 2 }];
        return { ...first, logs, rollup: rollupLogs(logs)! };
    };

    it("rates it by the mean of its logs", () => {
        expect(shelfFoot(both(), "rating")).toEqual({ rating: 8 });
    });

    it("dates it by the latest play on any of them", () => {
        expect(shelfFoot(both(), "played").value).toBe("Feb ’26");
    });

    it("counts its hours across every console", () => {
        expect(shelfFoot(both(), "hoursPlayed").value).toBe("85h");
    });

    /* A second run is usually the quicker one, and that is how long the game
       takes this person now. */
    it("times it by the quickest beat", () => {
        expect(shelfFoot(both(), "hoursToBeat").value).toBe("20h");
    });

    it("shows the best completion, as trophy lists differ by console", () => {
        expect(shelfFoot(both(), "completion").value).toBe("100%");
    });
});

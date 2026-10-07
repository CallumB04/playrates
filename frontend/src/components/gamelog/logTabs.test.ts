import { describe, expect, it } from "vitest";
import type { LogWithReview } from "@playrates/shared";
import { buildGameLog } from "../../test/msw/handlers";
import {
    isDirty,
    NEW_TAB,
    needsConsole,
    newTab,
    startingTab,
    tabForLog,
    takenBy,
} from "./logTabs";

const log = (overrides: Partial<LogWithReview> = {}): LogWithReview => {
    const { game: _game, ...plain } = buildGameLog();
    void _game;
    return { ...plain, review: null, ...overrides };
};

describe("log tabs", () => {
    it("opens a saved log with nothing to save", () => {
        const tab = tabForLog(log({ id: 4 }));
        expect(tab.key).toBe("log-4");
        expect(isDirty(tab)).toBe(false);
    });

    it("has something to save once the draft moves from the log", () => {
        const tab = tabForLog(log());
        expect(isDirty({ ...tab, draft: { ...tab.draft, rating: 3 } })).toBe(
            true
        );
    });

    it("always saves a new tab", () => {
        expect(isDirty(newTab())).toBe(true);
    });

    it("keeps the review that came with the log", () => {
        const tab = tabForLog(
            log({
                review: {
                    id: 1,
                    gameId: 1,
                    logId: 10,
                    body: "Good.",
                    isPublic: false,
                    containsSpoilers: true,
                    createdAt: "",
                    updatedAt: "",
                },
            })
        );
        expect(tab.hadReview).toBe(true);
        expect(tab.draft).toMatchObject({
            reviewBody: "Good.",
            reviewIsPublic: false,
            reviewSpoilers: true,
        });
    });

    it("lists the consoles the other tabs hold", () => {
        const tabs = [
            tabForLog(log({ id: 1, system: "steam" })),
            tabForLog(log({ id: 2, system: "nintendo-switch" })),
            newTab(),
        ];
        expect(takenBy(tabs, NEW_TAB)).toEqual(["steam", "nintendo-switch"]);
        expect(takenBy(tabs, "log-1")).toEqual(["nintendo-switch"]);
    });

    /* The console is what tells several logs apart. */
    it("needs a console on a new log beside another", () => {
        const tabs = [tabForLog(log({ id: 1 })), newTab()];
        expect(needsConsole(tabs[1]!, tabs)).toBe(true);
        expect(needsConsole(newTab(), [newTab()])).toBe(false);
    });

    /* The one log a game may have without one. */
    it("lets a log that never named a console stay that way", () => {
        const bare = tabForLog(log({ id: 1, system: null, platform: null }));
        const tabs = [bare, tabForLog(log({ id: 2, system: "steam" }))];
        expect(needsConsole(bare, tabs)).toBe(false);
    });

    it("opens on the log asked for, a new one, or the headline", () => {
        const tabs = [tabForLog(log({ id: 1 })), tabForLog(log({ id: 2 }))];
        expect(startingTab(tabs, 2, 1)).toBe("log-2");
        expect(startingTab(tabs, null, 1)).toBe(NEW_TAB);
        expect(startingTab(tabs, undefined, 1)).toBe("log-1");
    });
});

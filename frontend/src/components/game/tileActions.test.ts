import { describe, expect, it, vi } from "vitest";
import type { GameLogSummary } from "@playrates/shared";
import { tileActions } from "./tileActions";

const game = { id: 7, title: "Portal" };

const handlers = () => ({
    signIn: vi.fn(),
    open: vi.fn(),
    view: vi.fn(),
    quickAdd: vi.fn(),
    addToList: vi.fn(),
});

const logged = (platforms: number): GameLogSummary =>
    ({
        gameId: 7,
        status: "played",
        playedStatus: null,
        rating: null,
        logs: Array.from({ length: platforms }, (_, i) => ({ id: i })),
    }) as unknown as GameLogSummary;

const keys = (actions: { key: string }[]) => actions.map((a) => a.key);

describe("tileActions", () => {
    it("asks someone signed out to sign in, and nothing else", () => {
        const on = handlers();
        const actions = tileActions(
            game,
            { signedIn: false, log: undefined },
            on
        );
        expect(keys(actions)).toEqual(["signin"]);
        actions[0]!.onSelect();
        expect(on.signIn).toHaveBeenCalled();
    });

    it("offers a log or a shelf in one tap for a game not logged yet", () => {
        const on = handlers();
        const actions = tileActions(
            game,
            { signedIn: true, log: undefined },
            on
        );
        expect(keys(actions)).toEqual(["log", "list", "backlog", "wishlist"]);

        actions[2]!.onSelect();
        expect(on.quickAdd).toHaveBeenCalledWith(7, "Portal", "backlog");
        actions[0]!.onSelect();
        expect(on.open).toHaveBeenCalledWith(7);
    });

    /* Shelving a logged game would overwrite the status it already has. */
    it("offers view and edit, not a shelf, for a game already logged", () => {
        const on = handlers();
        const actions = tileActions(
            game,
            { signedIn: true, log: logged(1) },
            on
        );
        expect(keys(actions)).toEqual(["view", "edit", "list"]);
        expect(actions[0]!.label).toBe("View your log");

        actions[0]!.onSelect();
        expect(on.view).toHaveBeenCalledWith(7);
    });

    /* A row, not an icon: the icons shelve in one tap and show it done,
       and this opens a choice instead. */
    it("offers a list either way, as a row", () => {
        const on = handlers();
        const list = tileActions(
            game,
            { signedIn: true, log: undefined },
            on
        ).find((a) => a.key === "list")!;

        expect(list.icon).toBeUndefined();
        list.onSelect();
        expect(on.addToList).toHaveBeenCalledWith(7);
    });

    it("says logs when the game is logged on more than one console", () => {
        const actions = tileActions(
            game,
            { signedIn: true, log: logged(2) },
            handlers()
        );
        expect(actions[0]!.label).toBe("View your logs");
    });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { Eye } from "lucide-react";
import type { ShelfEntry } from "@playrates/shared";
import { useShelfTileActions } from "./useShelfTileActions";

const state = vi.hoisted(() => ({
    user: null as { id: string } | null,
    myLogIds: undefined as { gameId: number }[] | undefined,
    flow: { view: vi.fn(), open: vi.fn() },
}));

vi.mock("../../../contexts/AuthContext", () => ({
    useAuth: () => ({ user: state.user }),
}));
vi.mock("../../../components/gamelog/useLogFlow", () => ({
    useLogFlow: () => state.flow,
}));
vi.mock("../../../hooks/queries/useGameLogs", () => ({
    useMyGameLogIds: () => ({ data: state.myLogIds }),
}));

const entry = (gameId: number, logs = 1) =>
    ({
        gameId,
        logs: Array.from({ length: logs }, () => ({})),
    }) as unknown as ShelfEntry;

const actionsFor = (e: ShelfEntry, isMyAccount: boolean) =>
    renderHook(() =>
        useShelfTileActions("rival", isMyAccount)
    ).result.current.buildTileActions(e);

beforeEach(() => {
    state.user = { id: "me" };
    state.myLogIds = [{ gameId: 7 }];
    state.flow.view.mockClear();
    state.flow.open.mockClear();
});

describe("useShelfTileActions", () => {
    it("offers my own shelf's logs to view and edit", () => {
        const actions = actionsFor(entry(1, 2), true);

        expect(actions.map((a) => [a.key, a.label])).toEqual([
            ["view", "View logs"],
            ["edit", "Edit"],
        ]);
        actions[1]!.onSelect();
        expect(state.flow.open).toHaveBeenCalledWith(1);
        expect(actionsFor(entry(1), true)[0]!.label).toBe("View log");
    });

    it("says whose log it is on someone else's shelf", () => {
        const [view] = actionsFor(entry(1), false);

        expect(view!.label).toBe("Their log");
        view!.onSelect();
        expect(state.flow.view).toHaveBeenCalledWith(1, { owner: "rival" });
    });

    it("points to my log of a game we have both logged", () => {
        const actions = actionsFor(entry(7, 3), false);

        expect(actions.map((a) => [a.key, a.label])).toEqual([
            ["view", "Their logs"],
            ["myLog", "My log"],
        ]);
        actions[1]!.onSelect();
        expect(state.flow.view).toHaveBeenCalledWith(7);
    });

    it("offers to log a game I have not", () => {
        const actions = actionsFor(entry(1), false);

        expect(actions[1]!.key).toBe("add");
        actions[1]!.onSelect();
        expect(state.flow.open).toHaveBeenCalledWith(1);
    });

    it("keeps only their log, standing, when signed out", () => {
        state.user = null;

        const actions = actionsFor(entry(1), false);

        expect(actions).toHaveLength(1);
        expect(actions[0]).toMatchObject({ key: "view", standing: Eye });
    });

    it("has no set of my games until my logs load", () => {
        state.myLogIds = undefined;
        const { result } = renderHook(() =>
            useShelfTileActions("rival", false)
        );
        expect(result.current.myLogGameIds).toBeUndefined();

        state.myLogIds = [{ gameId: 7 }];
        const loaded = renderHook(() => useShelfTileActions("rival", false));
        expect(loaded.result.current.myLogGameIds).toEqual(new Set([7]));
    });
});

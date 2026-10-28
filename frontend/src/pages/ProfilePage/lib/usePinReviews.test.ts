import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { buildProfile, buildProgress } from "../../../test/msw/handlers";
import { usePinReviews } from "./usePinReviews";

const auth = vi.hoisted(() => ({ user: null as unknown }));
const progress = vi.hoisted(() => ({ data: undefined as unknown }));
const notify = vi.hoisted(() => vi.fn());
const mutate = vi.hoisted(() => vi.fn());

vi.mock("../../../contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("../../../contexts/NotificationContext", () => ({
    useNotify: () => notify,
}));
vi.mock("../../../hooks/queries/useProgress", () => ({
    useProgressQuery: () => progress,
    useSetStyle: () => ({ mutate, isPending: false }),
}));

const withSlots = (slots: number) => {
    const base = buildProgress();
    progress.data = {
        ...base,
        look: { ...base.look, pinnedReviewSlots: slots },
    };
};

beforeEach(() => {
    auth.user = buildProfile({ pinnedReviews: [1] });
    withSlots(2);
    notify.mockReset();
    mutate.mockReset();
});

describe("usePinReviews", () => {
    it("pins and unpins at once, saving each change", () => {
        const { result } = renderHook(() => usePinReviews());
        act(() => result.current.toggle(2));
        expect(result.current.pinned).toEqual([1, 2]);
        expect(mutate).toHaveBeenLastCalledWith(
            { pinnedReviews: [1, 2] },
            expect.anything()
        );

        act(() => result.current.toggle(1));
        expect(result.current.pinned).toEqual([2]);
    });

    it("says so rather than pinning past the slots", () => {
        withSlots(1);
        const { result } = renderHook(() => usePinReviews());
        act(() => result.current.toggle(2));
        expect(result.current.pinned).toEqual([1]);
        expect(mutate).not.toHaveBeenCalled();
        expect(notify).toHaveBeenCalledWith(
            "You can pin 1. More slots are in the shop.",
            "info"
        );
    });

    it("puts the pins back when the save fails", () => {
        mutate.mockImplementation((_input, { onError }) =>
            onError(new Error("no"))
        );
        const { result } = renderHook(() => usePinReviews());
        act(() => result.current.toggle(2));
        expect(result.current.pinned).toEqual([1]);
        expect(notify).toHaveBeenCalledWith("Couldn't save your pins", "error");
    });
});

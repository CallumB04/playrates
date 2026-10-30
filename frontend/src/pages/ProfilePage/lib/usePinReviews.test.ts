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

    // It used to send you to the shop, away from what you were pinning.
    it("offers another slot where you are, and pins it once bought", () => {
        withSlots(1);
        const { result } = renderHook(() => usePinReviews());
        expect(result.current.buying).toBeNull();

        act(() => result.current.toggle(2));
        expect(result.current.pinned).toEqual([1]);
        expect(mutate).not.toHaveBeenCalled();
        expect(result.current.buying?.item).toBe("slot_pinned_review");

        act(() => result.current.buying!.onBought());
        expect(mutate).toHaveBeenLastCalledWith(
            { pinnedReviews: [1, 2] },
            expect.anything()
        );
        act(() => result.current.buying!.onClose());
        expect(result.current.buying).toBeNull();
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

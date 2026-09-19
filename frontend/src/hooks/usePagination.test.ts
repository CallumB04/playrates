import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { usePagination } from "./usePagination";

describe("usePagination", () => {
    it("starts on page one", () => {
        const { result } = renderHook(() =>
            usePagination({ total: 100, perPage: 10 })
        );

        expect(result.current.page).toBe(1);
        expect(result.current.pageCount).toBe(10);
    });

    /**
     * ProfilePage used Math.floor(total / perPage) + 1, which produced an
     * extra empty page whenever the total divided exactly. LibraryPage used
     * ceil. Both now use ceil.
     */
    it("does not add a phantom page when the total divides exactly", () => {
        const { result } = renderHook(() =>
            usePagination({ total: 20, perPage: 10 })
        );

        expect(result.current.pageCount).toBe(2);
    });

    it("always reports at least one page, even when empty", () => {
        const { result } = renderHook(() =>
            usePagination({ total: 0, perPage: 10 })
        );

        expect(result.current.pageCount).toBe(1);
    });

    it("derives canPrev and canNext rather than storing them", () => {
        const { result } = renderHook(() =>
            usePagination({ total: 25, perPage: 10 })
        );

        expect(result.current.canPrev).toBe(false);
        expect(result.current.canNext).toBe(true);

        act(() => result.current.next());
        expect(result.current.canPrev).toBe(true);
        expect(result.current.canNext).toBe(true);

        act(() => result.current.next());
        expect(result.current.page).toBe(3);
        expect(result.current.canNext).toBe(false);
    });

    it("clamps rather than running past either end", () => {
        const { result } = renderHook(() =>
            usePagination({ total: 15, perPage: 10 })
        );

        act(() => result.current.prev());
        expect(result.current.page).toBe(1);

        act(() => result.current.next());
        act(() => result.current.next());
        expect(result.current.page).toBe(2);
    });

    it("clamps the current page when the list shrinks", () => {
        const { result, rerender } = renderHook(
            ({ total }) => usePagination({ total, perPage: 10 }),
            { initialProps: { total: 100 } }
        );

        act(() => result.current.setPage(9));
        expect(result.current.page).toBe(9);

        rerender({ total: 20 });
        expect(result.current.page).toBe(2);
    });

    it("slices a list down to the current page", () => {
        const items = Array.from({ length: 25 }, (_, i) => i);
        const { result } = renderHook(() =>
            usePagination({ total: items.length, perPage: 10 })
        );

        expect(result.current.slice(items)).toEqual([
            0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
        ]);

        act(() => result.current.next());
        expect(result.current.slice(items)[0]).toBe(10);

        act(() => result.current.setPage(3));
        expect(result.current.slice(items)).toEqual([20, 21, 22, 23, 24]);
    });
});

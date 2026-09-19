import { useEffect, useMemo, useState } from "react";

interface UsePaginationOptions {
    total: number;
    perPage: number;
}

export interface PaginationState {
    page: number;
    pageCount: number;
    canPrev: boolean;
    canNext: boolean;
    next: () => void;
    prev: () => void;
    setPage: (page: number) => void;
    /** Slices a list down to the current page. */
    slice: <T>(items: T[]) => T[];
}

/**
 * `canPrev` and `canNext` are derived rather than stored. The old pages kept
 * them in two pieces of state kept in sync by an effect.
 *
 * Note the page count formula: ProfilePage used Math.floor(n / perPage) + 1,
 * which produces a phantom empty final page whenever the total divides
 * exactly. LibraryPage already used ceil. This uses ceil for both.
 */
export const usePagination = ({
    total,
    perPage,
}: UsePaginationOptions): PaginationState => {
    const [page, setPage] = useState(1);

    const pageCount = Math.max(1, Math.ceil(total / perPage));

    // clamp when the list shrinks or the viewport changes the page size
    useEffect(() => {
        setPage((current) => Math.min(current, pageCount));
    }, [pageCount]);

    return useMemo(
        () => ({
            page,
            pageCount,
            canPrev: page > 1,
            canNext: page < pageCount,
            next: () => setPage((p) => Math.min(p + 1, pageCount)),
            prev: () => setPage((p) => Math.max(p - 1, 1)),
            setPage: (next: number) =>
                setPage(Math.min(Math.max(next, 1), pageCount)),
            slice: <T>(items: T[]) =>
                items.slice((page - 1) * perPage, page * perPage),
        }),
        [page, pageCount, perPage]
    );
};

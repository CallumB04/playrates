import { useEffect, useMemo, useState } from "react";

interface UsePaginationOptions {
    total: number;
    perPage: number;
    /**
     * Drive the page from outside — for server-driven lists, where the page
     * belongs in the URL and `total` is the server's count rather than the
     * length of what we happen to be holding.
     */
    page?: number;
    onPageChange?: (page: number) => void;
}

export interface PaginationState {
    page: number;
    pageCount: number;
    total: number;
    perPage: number;
    canPrev: boolean;
    canNext: boolean;
    next: () => void;
    prev: () => void;
    setPage: (page: number) => void;
    /** Slices a list down to the current page. Uncontrolled mode only. */
    slice: <T>(items: T[]) => T[];
}

/** `page` is the only state so the flags can't drift from it. Note the ceil:
 *  floor(total / perPage) + 1 adds an empty last page on exact division. */
export const usePagination = ({
    total,
    perPage,
    page: controlledPage,
    onPageChange,
}: UsePaginationOptions): PaginationState => {
    const [internalPage, setInternalPage] = useState(1);
    const isControlled = controlledPage !== undefined;

    const pageCount = Math.max(1, Math.ceil(total / perPage));
    const rawPage = isControlled ? controlledPage : internalPage;
    const page = Math.min(Math.max(rawPage, 1), pageCount);

    // Clamp when the list shrinks or the viewport changes the page size. The
    // controlled case is the owner's to fix — we only report the clamped page.
    useEffect(() => {
        if (isControlled) return;
        setInternalPage((current) => Math.min(current, pageCount));
    }, [pageCount, isControlled]);

    return useMemo(() => {
        const goTo = (next: number) => {
            const clamped = Math.min(Math.max(next, 1), pageCount);
            if (clamped === page) return;
            if (!isControlled) setInternalPage(clamped);
            onPageChange?.(clamped);
        };

        return {
            page,
            pageCount,
            total,
            perPage,
            canPrev: page > 1,
            canNext: page < pageCount,
            next: () => goTo(page + 1),
            prev: () => goTo(page - 1),
            setPage: goTo,
            slice: <T,>(items: T[]) =>
                items.slice((page - 1) * perPage, page * perPage),
        };
    }, [page, pageCount, perPage, total, isControlled, onPageChange]);
};

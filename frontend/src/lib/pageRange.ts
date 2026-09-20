export const ELLIPSIS = "…";

export type PageSlot = number | typeof ELLIPSIS;

/**
 * The page numbers to render, with gaps elided: `1 2 3 … 6595`.
 *
 * `siblings` is how many pages flank the current one. The window is kept at a
 * constant width regardless of where you are in the range, so the control
 * doesn't jump about as you page through — which means clamping the window
 * near both ends rather than just centring it.
 */
export const pageRange = (
    page: number,
    pageCount: number,
    siblings = 1
): PageSlot[] => {
    // first + last + current + two ellipses + the siblings either side
    const windowSize = siblings * 2 + 5;
    if (pageCount <= windowSize) {
        return Array.from({ length: pageCount }, (_, i) => i + 1);
    }

    const start = Math.max(2, Math.min(page - siblings, pageCount - windowSize + 3));
    const end = Math.min(pageCount - 1, Math.max(page + siblings, windowSize - 2));

    const slots: PageSlot[] = [1];
    // A gap of one is not worth eliding — the ellipsis costs the same width as
    // the number it would replace.
    if (start > 3) slots.push(ELLIPSIS);
    else if (start === 3) slots.push(2);

    for (let i = start; i <= end; i++) slots.push(i);

    if (end < pageCount - 2) slots.push(ELLIPSIS);
    else if (end === pageCount - 2) slots.push(pageCount - 1);

    slots.push(pageCount);
    return slots;
};

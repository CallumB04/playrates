/**
 * Tiles per page, fixed per breakpoint.
 *
 * This used to derive a continuous number from the viewport. With a
 * server-driven page that means a refetch on every frame of a window drag, and
 * a page count that changes as you resize — so it is quantised to four
 * breakpoints instead. 28 is the mockup's 7 columns × 4 rows.
 */
export const getLibraryGamesPerPage = (width: number): number => {
    if (width >= 1280) return 28;
    if (width >= 1024) return 21;
    if (width >= 768) return 18;
    return 12;
};

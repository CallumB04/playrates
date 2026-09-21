/**
 * Tiles per page, quantised to four breakpoints. A count derived continuously
 * from the viewport would refetch on every frame of a window drag.
 */
export const getLibraryGamesPerPage = (width: number): number => {
    if (width >= 1280) return 28;
    if (width >= 1024) return 21;
    if (width >= 768) return 18;
    return 12;
};

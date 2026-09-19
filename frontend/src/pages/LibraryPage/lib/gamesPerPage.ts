/**
 * How many tiles fit on one page of the library.
 *
 * The large-screen arithmetic derives from the actual grid measurements:
 *   105 + 4  tile width + gap
 *   64       page padding (32 each side)
 *   320      filters card
 *   16       gap between filters and grid
 *   140      tile height
 *   160      page padding (80 top and bottom)
 *   128      header card
 *   12       gap below the header card
 *
 * Extracted from the component so the boundaries can be tested directly.
 */
export const getLibraryGamesPerPage = (
    width: number,
    height: number
): number => {
    if (width >= 1024) {
        const gamesPerRow = Math.floor(
            (width - (64 + 320 + 16) + 4) / (105 + 4)
        );
        const rowsCount = Math.floor((height - (160 + 128 + 12)) / 140);
        return Math.max(1, gamesPerRow * rowsCount);
    }

    if (width < 584) return 18;
    if (width < 755) return 20;
    if (width < 894) return 20;
    return 18;
};

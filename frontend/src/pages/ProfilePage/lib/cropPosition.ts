/* The profile backdrop's height at each breakpoint, as PageBackdrop's
   "short" size draws it: h-[230px] sm:h-[320px] lg:h-[380px]. */
const BACKDROP_HEIGHTS = [
    { minWidth: 1024, height: 380 },
    { minWidth: 640, height: 320 },
    { minWidth: 0, height: 230 },
];

/** The window width a computer's backdrop is previewed at: a common
 *  laptop's, where the strip crops the picture most. */
export const REFERENCE_WIDTH = 1440;

/** The backdrop's width over its height on a window this wide. It spans
 *  the window, so a wider screen is a thinner strip of the picture. */
export const backdropAspect = (viewportWidth: number): number => {
    const { height } = BACKDROP_HEIGHTS.find(
        (b) => viewportWidth >= b.minWidth
    )!;
    return viewportWidth / height;
};

/**
 * The part of a picture a backdrop shows, as percentages of the picture's
 * height: where it starts and how tall it is. The picture fills the
 * backdrop's width, so the strip is as tall, relative to the picture, as
 * the picture is wide relative to the strip. A picture no taller than the
 * strip shows whole.
 */
export const cropWindow = (
    position: number,
    imageAspect: number,
    stripAspect: number
): { top: number; height: number } => {
    const height = Math.min(100, (imageAspect / stripAspect) * 100);
    return { top: (position / 100) * (100 - height), height };
};

/**
 * Where a drag leaves the window, 0 the top of the picture to 100 the
 * bottom. Only the picture's height outside the window is room to move,
 * so a drag that long crosses the whole range.
 */
export const dragPosition = ({
    start,
    dy,
    boxHeight,
    windowHeight,
}: {
    start: number;
    /** How far the pointer has moved since the drag began, down positive. */
    dy: number;
    /** The picture's drawn height. */
    boxHeight: number;
    /** The window's, as a percentage of the picture's. */
    windowHeight: number;
}): number => {
    const room = boxHeight * (1 - windowHeight / 100);
    if (room <= 0) return start;
    const next = Math.round(start + (dy / room) * 100);
    return Math.min(100, Math.max(0, next));
};

/** How tall a picture is drawn when it fills a frame's width. */
export const coverHeight = (
    frameWidth: number,
    naturalWidth: number,
    naturalHeight: number
): number =>
    naturalWidth > 0 ? (frameWidth * naturalHeight) / naturalWidth : 0;

/**
 * Where a drag leaves the crop, 0 the top of the picture to 100 the bottom.
 * Only the part of the picture taller than the frame can move, so a drag
 * the height of that spare part crosses the whole range. Dragging the
 * picture down brings more of its top into view, so the position falls.
 */
export const dragPosition = ({
    start,
    dy,
    frameHeight,
    imageHeight,
}: {
    start: number;
    dy: number;
    frameHeight: number;
    imageHeight: number;
}): number => {
    const spare = imageHeight - frameHeight;
    if (spare <= 0) return start;
    const next = Math.round(start - (dy / spare) * 100);
    return Math.min(100, Math.max(0, next));
};

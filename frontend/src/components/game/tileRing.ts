/** A ring round a cover, for the one marked out of a set: the winner, or
 *  your pick. On the cover itself, so it follows the cover's corners. */
export const TILE_RING = {
    strong: "ring-2 ring-brand ring-offset-2 ring-offset-surface",
    soft: "ring-2 ring-brand/50 ring-offset-2 ring-offset-surface",
} as const;

export type TileRing = keyof typeof TILE_RING;

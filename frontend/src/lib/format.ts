/** Uppercases the first character. */
export const capitalise = (value: string): string =>
    value.length === 0 ? value : value[0]!.toUpperCase() + value.slice(1);

/** The year from an ISO date, or an em dash when there isn't one. */
export const releaseYear = (isoDate: string | null | undefined): string =>
    isoDate ? isoDate.slice(0, 4) : "—";

/** Formats a 0–10 rating for display, or "?" when unrated. */
export const formatRating = (rating: number | null | undefined): string =>
    rating === null || rating === undefined ? "?" : String(rating);

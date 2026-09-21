/** Uppercases the first character. */
export const capitalise = (value: string): string =>
    value.length === 0 ? value : value[0]!.toUpperCase() + value.slice(1);

/** The year from an ISO date, or an em dash when there isn't one. */
/** "12 Mar 26" — enough to place a new release without spelling the year. */
export const formatReleaseShort = (
    isoDate: string | null | undefined
): string => {
    if (!isoDate) return "TBA";
    const date = new Date(isoDate);
    return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
    });
};

export const releaseYear = (isoDate: string | null | undefined): string =>
    isoDate ? isoDate.slice(0, 4) : "—";

/** Always two decimals, so a column of ratings lines up. */
export const formatRating = (rating: number | null | undefined): string =>
    rating === null || rating === undefined ? "—" : rating.toFixed(2);

/** "8.25/10", for plain-text spots that can't use RatingBadge. */
export const formatRatingOutOfTen = (
    rating: number | null | undefined
): string =>
    rating === null || rating === undefined
        ? "—"
        : `${formatRating(rating)}/10`;

/** A count with thousands separators. */
export const formatCount = (value: number | null | undefined): string =>
    value === null || value === undefined ? "—" : value.toLocaleString("en-GB");

/** Hours played, trimmed of a pointless trailing zero. */
export const formatHours = (hours: number | null | undefined): string => {
    if (hours === null || hours === undefined) return "—";
    const rounded = Math.round(hours * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}h`;
};

/** Achievements and the like, as "46/52". */
export const formatFraction = (
    completed: number | null | undefined,
    total: number | null | undefined
): string =>
    completed === null || completed === undefined || !total
        ? "—"
        : `${completed}/${total}`;

/** A percentage with no decimals, for progress bars. */
export const formatPercent = (fraction: number): string =>
    `${Math.round(fraction * 100)}%`;

const MONTH_YEAR = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
});

/** "July 2021", for member-since lines. */
export const formatMonthYear = (iso: string | null | undefined): string =>
    iso ? MONTH_YEAR.format(new Date(iso)) : "—";

const LONG_DATE = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
});

/** "11 Feb 2026". */
export const formatDate = (iso: string | null | undefined): string =>
    iso ? LONG_DATE.format(new Date(iso)) : "—";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * "4h ago", "2 days ago". Falls back to an absolute date past a month, where
 * relative time stops being useful.
 */
export const relativeTime = (
    iso: string | null | undefined,
    now: number = Date.now()
): string => {
    if (!iso) return "—";
    const elapsed = now - new Date(iso).getTime();
    if (elapsed < MINUTE) return "just now";
    if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m ago`;
    if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h ago`;
    const days = Math.floor(elapsed / DAY);
    if (days === 1) return "yesterday";
    if (days < 30) return `${days} days ago`;
    return formatDate(iso);
};

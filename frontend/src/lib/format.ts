/** Uppercases the first character. */
export const capitalise = (value: string): string =>
    value.length === 0 ? value : value[0]!.toUpperCase() + value.slice(1);

/**
 * The zone timestamps render in, from the signed-in profile. Set once by
 * AuthContext rather than threaded through every call site; changing it
 * refetches the profile, which repaints everything that shows a date.
 */
let displayZone = "UTC";

export const setDisplayTimeZone = (zone: string): void => {
    displayZone = zone;
};

export const displayTimeZone = (): string => displayZone;

/* Where a zone cannot be worked out at all. A real place rather than UTC, so
   the offsets and the daylight-saving jumps are somebody's. */
const FALLBACK_ZONE = "Europe/London";

/** The zone the browser reports, for someone who has never chosen one. */
export const browserTimeZone = (): string => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return zone && zone !== "UTC" ? zone : FALLBACK_ZONE;
};

/** "UTC" is the column default, which means nobody has chosen yet — so the
 *  browser's own zone stands in until they do. */
export const effectiveTimeZone = (stored: string | undefined): string =>
    stored && stored !== "UTC" ? stored : browserTimeZone();

/** Every zone the runtime knows. supportedValuesOf is ES2022 and the app
 *  compiles to ES2020, so it is reached through a narrow cast. */
export const timeZones = (): string[] => {
    const supported = (
        Intl as { supportedValuesOf?: (key: "timeZone") => string[] }
    ).supportedValuesOf;
    return supported ? supported("timeZone") : [browserTimeZone()];
};

/* A formatter per zone and shape. Building one is not cheap, and a list of
   reviews asks for the same two over and over. */
const cache = new Map<string, Intl.DateTimeFormat>();

const formatter = (
    options: Intl.DateTimeFormatOptions,
    zone: string
): Intl.DateTimeFormat => {
    const key = `${zone}|${JSON.stringify(options)}`;
    let found = cache.get(key);
    if (!found) {
        found = new Intl.DateTimeFormat("en-GB", {
            ...options,
            timeZone: zone,
        });
        cache.set(key, found);
    }
    return found;
};

/* A date-only column is the day you picked, so it is read back in UTC. Shifting
   it into a zone moves a finish date across midnight. */
const isDateOnly = (iso: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(iso);

const zoneFor = (iso: string): string =>
    isDateOnly(iso) ? "UTC" : displayZone;

/** "12 Mar" — enough to place a new release without spelling the year. */
export const formatReleaseShort = (
    isoDate: string | null | undefined
): string =>
    isoDate
        ? formatter(
              { day: "numeric", month: "short" },
              zoneFor(isoDate)
          ).format(new Date(isoDate))
        : "TBA";

/** The year from an ISO date, or an em dash when there isn't one. */
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

/** "July 2021", for member-since lines. */
export const formatMonthYear = (iso: string | null | undefined): string =>
    iso
        ? formatter({ month: "long", year: "numeric" }, zoneFor(iso)).format(
              new Date(iso)
          )
        : "—";

/** "11 Feb 2026". */
export const formatDate = (iso: string | null | undefined): string =>
    iso
        ? formatter(
              { day: "numeric", month: "short", year: "numeric" },
              zoneFor(iso)
          ).format(new Date(iso))
        : "—";

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

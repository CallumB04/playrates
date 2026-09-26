import type { AdminBucket, AdminPeriodFigure } from "@playrates/shared";

const MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Bucket dates are UTC calendar days, so they are read as such rather than
 *  through the viewer's zone, which could move them a day. */
export const bucketLabel = (bucket: string, size: AdminBucket): string => {
    const [, month, day] = bucket.split("-").map(Number);
    const label = `${day} ${MONTHS[month! - 1]}`;
    return size === "week" ? `w/c ${label}` : label;
};

/** 1,284 · 12.9k · 1.2m: an axis tick, where width matters. */
export const compactNumber = (value: number): string =>
    new Intl.NumberFormat("en-GB", {
        notation: "compact",
        maximumFractionDigits: 1,
    }).format(value);

export type ChangeDirection = "up" | "down" | "flat" | "new";

export const changeDirection = (figure: AdminPeriodFigure): ChangeDirection => {
    if (figure.change === null) return "new";
    if (Math.abs(figure.change) < 0.005) return "flat";
    return figure.change > 0 ? "up" : "down";
};

/** "+50%", "−20%", "New" for growth from nothing, "No change". */
export const formatChange = (figure: AdminPeriodFigure): string => {
    const direction = changeDirection(figure);
    if (direction === "new") return "New";
    if (direction === "flat") return "No change";
    const percent = Math.round(Math.abs(figure.change!) * 100);
    // A true minus, which lines up with the plus in a tabular face.
    return `${direction === "up" ? "+" : "−"}${percent}%`;
};

export const RANGE_LABELS = {
    "7d": "7 days",
    "30d": "30 days",
    "90d": "90 days",
    "12m": "12 months",
} as const;

/** 0.4567 → "46%". Null, where there is nothing to divide, reads as a dash. */
export const share = (part: number, whole: number): string =>
    whole === 0 ? "—" : `${Math.round((part / whole) * 100)}%`;

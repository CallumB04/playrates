import type { AdminBucket } from "@playrates/shared";

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

export const RANGE_LABELS = {
    "7d": "7 days",
    "30d": "30 days",
    "90d": "90 days",
    "12m": "12 months",
} as const;

/** 0.4567 → "46%". With nothing to divide it reads as a dash. */
export const share = (part: number, whole: number): string =>
    whole === 0 ? "—" : `${Math.round((part / whole) * 100)}%`;

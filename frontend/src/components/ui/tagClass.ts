import { cn } from "../../lib/cn";

const TONES = {
    /** Says what something is: a kind, a category. */
    neutral: "border-subtle bg-surface-raised/80 text-content-secondary",
    /** Wants attention, or is yours: a countdown, your pick. */
    brand: "border-brand/30 bg-brand-subtle text-brand-text",
    /** Happening now. */
    live: "border-danger-border bg-danger-subtle text-danger-content",
    /** Over, or not to hand. */
    muted: "border-transparent bg-surface-sunken text-content-muted",
} as const;

export type TagTone = keyof typeof TONES;

/** A label on something: a rectangle with small corners. The buttons'
 *  10px (rounded-sm) on something this short already reads as a pill. */
export const tagClass = (tone: TagTone = "neutral", className?: string) =>
    cn(
        "inline-flex w-fit items-center gap-1.5 rounded-xs border px-2 py-1 text-label-sm leading-none font-semibold backdrop-blur-sm",
        TONES[tone],
        className
    );

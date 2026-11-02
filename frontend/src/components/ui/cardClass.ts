import { cn } from "../../lib/cn";

/* Named rather than overridden: cn() joins classes without merging them, so
   a p-0 passed in beside the default p-4 would leave both, and the stylesheet
   would pick the winner. */
const PADDING = {
    default: "p-4 sm:p-5",
    /** For a card whose content sets its own: a header strip, a banner. */
    none: "",
} as const;

const TONE = {
    default: "border-subtle bg-surface-raised",
    /** A card that wants something from you. */
    accent: "border-brand/30 bg-surface-raised",
    /** The newest of a run, edged in the accent: the latest patch notes. */
    latest: "border-accent/50 bg-surface-raised",
    /** A card holding something that cannot be undone. */
    danger: "border-danger/40 bg-surface-raised",
    /** The page's one invitation: tinted in the brand's colour. */
    feature:
        "border-brand/30 bg-linear-to-br from-brand-subtle to-surface-raised",
} as const;

export type CardPadding = keyof typeof PADDING;
export type CardTone = keyof typeof TONE;

export interface CardOptions {
    padding?: CardPadding;
    tone?: CardTone;
}

/** For elements that need the card surface but aren't a div — a <section>,
 *  a <form>. */
export const cardClass = (
    className?: string,
    { padding = "default", tone = "default" }: CardOptions = {}
) =>
    cn(
        "rounded-lg border shadow-plate",
        TONE[tone],
        PADDING[padding],
        className
    );

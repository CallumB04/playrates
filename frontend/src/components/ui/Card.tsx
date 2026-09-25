import type { HTMLAttributes } from "react";
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
    default: "border-subtle",
    /** A card that wants something from you. */
    accent: "border-brand/30",
    /** A card holding something that cannot be undone. */
    danger: "border-danger/40",
} as const;

export type CardPadding = keyof typeof PADDING;
export type CardTone = keyof typeof TONE;

interface CardOptions {
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
        "rounded-lg border bg-surface-raised shadow-plate",
        TONE[tone],
        PADDING[padding],
        className
    );

interface CardProps extends HTMLAttributes<HTMLDivElement>, CardOptions {}

const Card = ({ className, padding, tone, ...props }: CardProps) => (
    <div className={cardClass(className, { padding, tone })} {...props} />
);

/** A card's title. Cards carry a title, and a description only when one earns its place. */
export const CardHeader = ({
    className,
    ...props
}: HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className={cn("text-label text-content-muted", className)} {...props} />
);

export default Card;

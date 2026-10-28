import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

/*
 * The site's surfaces, from the page down. Pick by what the thing is, not
 * by how loud it should be:
 *
 * - A page's own header (its title and actions) sits on the page, never
 *   in a card: profile, game, community, progress, shop alike.
 * - Panel: a titled block in a page's main column, its title in a strip.
 * - AsideCard: a widget in a side column, under a small muted label, with
 *   compact rows. Community's side column is the model.
 * - Card: a plain surface for content that needs one and has no title of
 *   its own: a list, a form, a grid.
 * - tone "feature": the one card on a page that invites you to do
 *   something (make your Gaming 25, invite a friend). One at most.
 */

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
    /** A card holding something that cannot be undone. */
    danger: "border-danger/40 bg-surface-raised",
    /** The page's one invitation: tinted in the brand's colour. */
    feature:
        "border-brand/30 bg-linear-to-br from-brand-subtle to-surface-raised",
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
        "rounded-lg border shadow-plate",
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

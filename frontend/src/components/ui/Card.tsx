import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";
import { cardClass, type CardOptions } from "./cardClass";

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

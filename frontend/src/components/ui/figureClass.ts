import { cn } from "../../lib/cn";

export type FigureSize = "display" | "lg" | "row" | "label";

const SIZE: Record<FigureSize, string> = {
    display: "text-figure",
    /** A stat on a card: the game page's score cards, a profile's counts. */
    lg: "text-figure-lg",
    row: "text-figure-row",
    label: "text-figure-sm",
};

/** The figure's type, for a value that is not a plain number — a rating
 *  badge, "31h", a skeleton standing in for either. */
export const figureClass = (size: FigureSize = "row", className?: string) =>
    cn("font-mono text-content tabular-nums", SIZE[size], className);

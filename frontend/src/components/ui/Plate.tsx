import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

/**
 * The signature surface.
 *
 * Everything is a card lit from above: a soft ambient shadow, a tighter key
 * shadow, and a 1px rim of light along the top edge. Depth is how far a thing
 * has risen off the page, never how far it has been pushed into it.
 */
export type PlateState = "raised" | "flat" | "pressed";
export type PlateDepth = "shallow" | "deep";

const STATE: Record<PlateState, string> = {
    raised: "bg-surface-raised border-subtle shadow-plate",
    flat: "bg-surface-raised border-subtle",
    /* Kept for callers that still ask for it. In Vellum a "pressed" surface
       is simply one that has not risen — it recedes by sitting flat and
       losing its rim, not by being stamped in. */
    pressed: "bg-surface-sunken border-subtle",
};

export const plateClass = (
    state: PlateState = "raised",
    depth: PlateDepth = "shallow",
    className?: string
): string =>
    cn(
        "rounded-md border",
        state === "raised" && depth === "deep"
            ? "bg-surface-raised border-subtle shadow-lifted"
            : STATE[state],
        className
    );

interface PlateProps extends HTMLAttributes<HTMLDivElement> {
    state?: PlateState;
    depth?: PlateDepth;
}

const Plate = ({
    state = "raised",
    depth = "shallow",
    className,
    ...props
}: PlateProps) => (
    <div className={plateClass(state, depth, className)} {...props} />
);

export default Plate;

import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

/**
 * The signature surface: a soft ambient shadow, a tighter key shadow, and a
 * 1px rim of light along the top edge.
 */
export type PlateState = "raised" | "flat" | "pressed";
export type PlateDepth = "shallow" | "deep";

const STATE: Record<PlateState, string> = {
    raised: "bg-surface-raised border-subtle shadow-plate",
    flat: "bg-surface-raised border-subtle",
    /* A well set into the surface around it, at the strength the app draws
       one: the current game on the home page, a log's headline figures. */
    pressed: "bg-surface-sunken/40 border-subtle",
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

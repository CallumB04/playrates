import { cn } from "../../lib/cn";

const SHAPE = {
    /** A menu hanging off the header: the account menu, the inbox. */
    menu: "rounded-lg",
    /** A list of options or a note beside a control, set tighter. */
    list: "rounded-md",
} as const;

export type PopoverShape = keyof typeof SHAPE;

/**
 * The surface of anything that floats over the page. Position and size stay
 * with the caller, since every popover hangs off a different thing; what they
 * share is how far off the page they sit, and how they arrive.
 */
export const popoverClass = (
    className?: string,
    shape: PopoverShape = "list"
) =>
    cn(
        "animate-settle border border-subtle bg-surface-raised shadow-modal",
        SHAPE[shape],
        className
    );

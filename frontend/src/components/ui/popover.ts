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

/**
 * Where a menu hangs off its trigger, across. As wide as the trigger,
 * unless it sets a width of its own, when the trigger's is only its least;
 * then a trigger in the right half of the window has it hang from its right
 * edge, or a wide menu off a control near that edge runs off the screen.
 */
export const menuAcross = (
    trigger: { left: number; right: number; width: number },
    viewportWidth: number,
    ownWidth: boolean
): { left?: number; right?: number; width?: number; minWidth?: number } => {
    if (!ownWidth) return { left: trigger.left, width: trigger.width };
    return trigger.left + trigger.width / 2 > viewportWidth / 2
        ? { right: viewportWidth - trigger.right, minWidth: trigger.width }
        : { left: trigger.left, minWidth: trigger.width };
};

const EDGE = 8;
const GAP = 6;

/**
 * Where a panel of a known size floats off its anchor, fixed to the window:
 * along the anchor's start or end, kept inside the window, and above it
 * where there isn't room below.
 */
export const floatBeside = (
    anchor: { top: number; bottom: number; left: number; right: number },
    viewport: { width: number; height: number },
    panel: { width: number; height: number },
    align: "start" | "end"
): { top: number; left: number } => {
    const along = align === "end" ? anchor.right - panel.width : anchor.left;
    const left = Math.min(
        Math.max(EDGE, along),
        viewport.width - panel.width - EDGE
    );
    const below = anchor.bottom + GAP;
    const fitsBelow = below + panel.height <= viewport.height - EDGE;
    const above = anchor.top - GAP - panel.height;
    return { left, top: fitsBelow || above < EDGE ? below : above };
};

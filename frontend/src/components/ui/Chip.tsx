import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";
import { chipClass } from "./chipClass";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    selected?: boolean;
    /** A 7px square swatch before the label. */
    dotClassName?: string;
}

/** Filter chips. `aria-pressed` drives both the semantics and the styling. */
const Chip = ({
    selected = false,
    dotClassName,
    className,
    children,
    ...props
}: ChipProps) => (
    <button
        type="button"
        aria-pressed={selected}
        className={chipClass(selected, className)}
        {...props}
    >
        {dotClassName && (
            <span
                className={cn("size-1.5 shrink-0 rounded-full", dotClassName)}
            />
        )}
        {children}
    </button>
);

export default Chip;

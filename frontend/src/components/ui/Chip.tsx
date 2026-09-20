import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    selected?: boolean;
    /** A 7px square swatch before the label. */
    dotClassName?: string;
}

/**
 * Filter chips. `aria-pressed` is the source of truth for both the semantics
 * and the styling, so the two can't drift apart.
 */
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
        className={cn(
            "plate-press inline-flex min-h-11 items-center gap-2 border px-2.5 text-label-sm sm:min-h-0 sm:py-1.5",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
            selected
                ? "border-brand-deep bg-brand text-content-on-solid shadow-lip"
                : "border-strong bg-surface text-content-secondary hover:border-brand",
            className
        )}
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

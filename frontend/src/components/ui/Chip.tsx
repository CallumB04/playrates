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
            "lift inline-flex min-h-11 items-center gap-2 rounded-full border px-3.5 text-label-sm sm:min-h-0 sm:py-1.5",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
            selected
                ? "border-brand-deep bg-brand text-content-on-solid shadow-plate"
                : "border-subtle bg-surface-raised text-content-secondary hover:-translate-y-px hover:border-strong hover:text-content",
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

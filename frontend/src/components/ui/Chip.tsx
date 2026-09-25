import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    selected?: boolean;
    /** A 7px square swatch before the label. */
    dotClassName?: string;
}

/** For a chip that has to be something other than a button — a link to a
 *  shelf, say, which navigates rather than filters. */
export const chipClass = (selected = false, className?: string) =>
    cn(
        "inline-flex min-h-11 items-center gap-2 rounded-full border px-3.5 text-label-sm lift sm:min-h-0 sm:py-1.5",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        selected
            ? "border-brand-deep bg-brand text-content-on-solid shadow-plate"
            : "border-subtle bg-surface-raised text-content-secondary hover:-translate-y-px hover:border-strong hover:text-content",
        className
    );

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

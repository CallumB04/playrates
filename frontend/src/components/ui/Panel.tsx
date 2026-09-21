import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

/**
 * A card with a header strip. `Card` is the plain surface; this is the one
 * that carries a title. `accent` is for a panel that wants something from you.
 */
interface PanelProps {
    title: ReactNode;
    /** The right of the header strip — a count, a control, a note. */
    trailing?: ReactNode;
    accent?: boolean;
    className?: string;
    bodyClassName?: string;
    children: ReactNode;
}

const Panel = ({
    title,
    trailing,
    accent = false,
    className,
    bodyClassName,
    children,
}: PanelProps) => (
    <section
        className={cn(
            "overflow-hidden rounded-lg border bg-surface-raised shadow-plate",
            accent ? "border-brand/30" : "border-subtle",
            className
        )}
    >
        <header
            className={cn(
                "flex items-center justify-between gap-3 border-b px-4 py-2.5",
                accent
                    ? "border-brand/20 bg-brand-subtle"
                    : "border-subtle bg-surface-sunken/40"
            )}
        >
            <h2
                className={cn(
                    "font-display text-base font-semibold",
                    accent ? "text-brand" : "text-content"
                )}
            >
                {title}
            </h2>
            {trailing}
        </header>
        <div className={cn(bodyClassName ?? "p-4")}>{children}</div>
    </section>
);

/** The figure that usually sits in a panel's `trailing` slot. */
export const PanelCount = ({
    value,
    accent = false,
}: {
    value: string;
    accent?: boolean;
}) => (
    <span
        className={cn(
            "shrink-0 rounded-full px-2 py-0.5 font-mono text-label-sm tabular-nums",
            accent
                ? "bg-brand/15 text-brand"
                : "bg-surface-sunken text-content-muted"
        )}
    >
        {value}
    </span>
);

export default Panel;

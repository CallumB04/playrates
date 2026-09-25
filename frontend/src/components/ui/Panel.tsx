import type { ReactNode } from "react";
import { cardClass } from "./Card";
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
        className={cardClass(cn("overflow-hidden", className), {
            padding: "none",
            tone: accent ? "accent" : "default",
        })}
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

/** A full-width action along a panel's foot: "See all", say. For a Link as
 *  well as a button, so it takes a class rather than being a component. */
export const panelButtonClass = (accent = false, className?: string) =>
    cn(
        "flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-sm border px-3 py-2 text-body-sm lift sm:min-h-0",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        accent
            ? "border-brand/40 text-brand hover:border-brand"
            : "border-subtle text-content-secondary hover:border-strong hover:text-content",
        className
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

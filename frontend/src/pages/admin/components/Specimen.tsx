import type { ReactNode } from "react";
import { cn } from "../../../lib/cn";

interface SpecimenProps {
    title: string;
    /** What this component is for, and anything non-obvious about using it. */
    notes?: string;
    /** Rendered under the demo, e.g. the props that matter. */
    meta?: string;
    /** Demos that need room to breathe, like a full-width navbar. */
    fullBleed?: boolean;
    /** Lay the demo out in a column rather than a wrapping row. */
    stack?: boolean;
    children: ReactNode;
}

/** A labelled frame around one component demo. */
const Specimen = ({
    title,
    notes,
    meta,
    fullBleed = false,
    stack = false,
    children,
}: SpecimenProps) => (
    <section className="flex flex-col gap-3 border border-strong bg-surface-raised p-4 shadow-lip">
        <header className="flex flex-col gap-1">
            <h3 className="font-display text-section text-content">{title}</h3>
            {notes && (
                <p className="max-w-prose text-body-sm text-content-secondary">
                    {notes}
                </p>
            )}
        </header>

        <div
            className={cn(
                "bg-surface-sunken",
                fullBleed && "relative overflow-hidden",
                !fullBleed && stack && "flex flex-col gap-4 p-4",
                !fullBleed && !stack && "flex flex-wrap items-center gap-4 p-4"
            )}
        >
            {children}
        </div>

        {meta && <p className="font-mono text-xs text-content-muted">{meta}</p>}
    </section>
);

export default Specimen;

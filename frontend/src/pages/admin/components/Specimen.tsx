import type { ReactNode } from "react";

interface SpecimenProps {
    title: string;
    /** What this component is for, and anything non-obvious about using it. */
    notes?: string;
    /** Rendered under the demo, e.g. the props that matter. */
    meta?: string;
    /** Demos that need room to breathe, like a full-width navbar. */
    fullBleed?: boolean;
    children: ReactNode;
}

/**
 * A labelled frame around one component demo. Everything in the gallery goes
 * through this so the page stays scannable as components are added.
 */
const Specimen = ({
    title,
    notes,
    meta,
    fullBleed = false,
    children,
}: SpecimenProps) => (
    <section className="flex flex-col gap-3 rounded-lg border border-subtle bg-surface-raised p-4">
        <header className="flex flex-col gap-1">
            <h3 className="font-lexend text-base font-semibold text-content">
                {title}
            </h3>
            {notes && (
                <p className="max-w-prose text-sm text-content-secondary">
                    {notes}
                </p>
            )}
        </header>

        <div
            className={
                fullBleed
                    ? "relative overflow-hidden rounded-md bg-surface-sunken"
                    : "flex flex-wrap items-center gap-4 rounded-md bg-surface-sunken p-4"
            }
        >
            {children}
        </div>

        {meta && <p className="font-mono text-xs text-content-muted">{meta}</p>}
    </section>
);

export default Specimen;

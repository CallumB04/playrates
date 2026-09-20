import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

interface EmptyPlateProps {
    /** A mono eyebrow, e.g. "NOTHING ON FILE". */
    eyebrow?: string;
    title: string;
    /** One instruction with an opinion in it. */
    body?: ReactNode;
    action?: ReactNode;
    className?: string;
}

/**
 * The charm comes from the writing and the drawer metaphor, not from an
 * illustration — so this is a dashed slot with a sentence in it.
 */
const EmptyPlate = ({
    eyebrow,
    title,
    body,
    action,
    className,
}: EmptyPlateProps) => (
    <div
        className={cn(
            "flex flex-col items-center gap-3 border border-dashed border-strong bg-surface-sunken px-6 py-10 text-center",
            className
        )}
    >
        {eyebrow && (
            <span className="font-mono text-label uppercase text-content-muted">
                {eyebrow}
            </span>
        )}
        <h3 className="font-display text-section text-content">{title}</h3>
        {body && (
            <p className="max-w-[44ch] text-body-sm text-content-secondary">
                {body}
            </p>
        )}
        {action && <div className="mt-1">{action}</div>}
    </div>
);

/** The dashed companion slots that sit beside one real card on a bare shelf. */
export const GhostTile = ({ className }: { className?: string }) => (
    <div
        aria-hidden="true"
        className={cn(
            "aspect-3/4 border border-dashed border-strong bg-surface-sunken",
            className
        )}
    />
);

export default EmptyPlate;

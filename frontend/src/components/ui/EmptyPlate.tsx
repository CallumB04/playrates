import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

interface EmptyPlateProps {
    /** A small eyebrow above the title, e.g. "Nothing here yet". */
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
            "flex flex-col items-center gap-3 rounded-lg border border-dashed border-strong bg-surface-sunken/60 px-6 py-12 text-center",
            className
        )}
    >
        {eyebrow && (
            <span className="text-label text-content-muted">
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
            "aspect-3/4 rounded-md border border-dashed border-strong bg-surface-sunken/60",
            className
        )}
    />
);

export default EmptyPlate;

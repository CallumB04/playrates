import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

interface EmptyPlateProps {
    title: string;
    /** One instruction with an opinion in it. */
    body?: ReactNode;
    action?: ReactNode;
    className?: string;
}

/**
 * A dashed slot with a sentence in it. There is no eyebrow: "Nothing here yet"
 * sitting above "No friends yet" said the same thing twice in a smaller font.
 */
const EmptyPlate = ({
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

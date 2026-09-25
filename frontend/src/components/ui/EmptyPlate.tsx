import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

interface EmptyPlateProps {
    title: string;
    /** One instruction with an opinion in it. */
    body?: ReactNode;
    action?: ReactNode;
    className?: string;
}

/** A dashed slot with one sentence in it. No eyebrow — it would repeat the
 *  sentence in a smaller font. */
const EmptyPlate = ({ title, body, action, className }: EmptyPlateProps) => (
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

/** The same dashed slot at feed size, where the whole empty state is one
 *  sentence and a title above it would say it twice. */
export const EmptyNote = ({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) => (
    <p
        className={cn(
            "rounded-md border border-dashed border-strong bg-surface-sunken/40 px-4 py-6 text-center text-body-sm text-content-muted",
            className
        )}
    >
        {children}
    </p>
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

import { useState, type ReactNode } from "react";
import { EyeOff } from "lucide-react";
import { cn } from "../../lib/cn";

interface SpoilerCoverProps {
    /** False shows the content with no cover at all. */
    covered: boolean;
    /** What pressing does, e.g. "Show review". */
    revealLabel: string;
    children: ReactNode;
    className?: string;
}

/**
 * Keeps something marked as a spoiler out of sight until it is asked for.
 * The cover is a real button, so it can be reached and pressed from a
 * keyboard; once opened it stays open.
 */
const SpoilerCover = ({
    covered,
    revealLabel,
    children,
    className,
}: SpoilerCoverProps) => {
    const [shown, setShown] = useState(false);
    if (!covered || shown) return <>{children}</>;

    return (
        <button
            type="button"
            onClick={() => setShown(true)}
            className={cn(
                "flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-md border border-dashed border-strong bg-surface-sunken/60 px-3 py-2 text-left lift",
                "hover:border-brand/50 hover:bg-surface-hover",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                className
            )}
        >
            <EyeOff
                size={15}
                aria-hidden
                className="shrink-0 text-content-muted"
            />
            <span className="text-body-sm text-content-secondary">
                Contains spoilers.
            </span>
            <span className="text-body-sm font-medium text-brand">
                {revealLabel}
            </span>
        </button>
    );
};

/** The same notice where the row is itself a link, and a button inside it
 *  cannot be: the reader opens the review where it lives instead. */
export const SpoilerNote = ({ className }: { className?: string }) => (
    <span
        className={cn(
            "inline-flex items-center gap-1.5 text-body-sm text-content-muted italic",
            className
        )}
    >
        <EyeOff size={13} aria-hidden className="shrink-0" />
        Contains spoilers
    </span>
);

export default SpoilerCover;

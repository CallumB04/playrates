import { ArrowBigUp } from "lucide-react";
import { cn } from "../../lib/cn";

interface VoteButtonProps {
    count: number;
    voted: boolean;
    onToggle: () => void;
    /** Set when the viewer cannot vote, and says why — the tally still shows,
     *  so a signed-out viewer or the author can read it. */
    disabledReason?: string | null;
    className?: string;
}

/**
 * One upvote per person per review. The count is the label, so the whole thing
 * is one touch target, and pressing again withdraws the vote.
 */
const VoteButton = ({
    count,
    voted,
    onToggle,
    disabledReason,
    className,
}: VoteButtonProps) => {
    const disabled = !!disabledReason;
    return (
        <button
            type="button"
            onClick={onToggle}
            disabled={disabled}
            aria-pressed={voted}
            aria-label={
                disabled
                    ? `${count} upvotes. ${disabledReason}`
                    : voted
                      ? "Remove your upvote"
                      : "Upvote this review"
            }
            title={disabledReason ?? undefined}
            className={cn(
                "inline-flex min-h-11 items-center gap-1 rounded-full border px-2.5 py-1 text-label-sm transition-colors lift sm:min-h-0",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                voted
                    ? "border-brand bg-brand-subtle text-brand"
                    : "border-subtle text-content-muted hover:border-strong hover:text-content",
                disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                className
            )}
        >
            <ArrowBigUp
                size={15}
                aria-hidden
                className={cn("shrink-0", voted && "fill-brand")}
            />
            <span className="font-mono tabular-nums">{count}</span>
        </button>
    );
};

export default VoteButton;

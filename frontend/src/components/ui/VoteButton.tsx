import { ArrowBigUp } from "lucide-react";
import { cn } from "../../lib/cn";

interface VoteButtonProps {
    count: number;
    voted: boolean;
    onToggle: () => void;
    /** Signed-out viewers see the tally but cannot add to it. */
    disabled?: boolean;
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
    disabled = false,
    className,
}: VoteButtonProps) => (
    <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={voted}
        aria-label={voted ? "Remove your upvote" : "Upvote this review"}
        title={disabled ? "Sign in to vote" : undefined}
        className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-label-sm transition-colors lift",
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

export default VoteButton;

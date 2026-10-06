import { useEffect, useState } from "react";
import { ArrowBigUp } from "lucide-react";
import { cn } from "../../lib/cn";

interface VoteButtonProps {
    count: number;
    voted: boolean;
    /** Return the request's promise, and the button takes the vote back if
     *  it fails. */
    onToggle: () => unknown;
    /** Set when the viewer cannot vote, and says why — the tally still shows,
     *  so a signed-out viewer or the author can read it. */
    disabledReason?: string | null;
    /** What is being upvoted, for the label. */
    noun?: string;
    className?: string;
}

/**
 * One upvote per person per thing. The count is the label, so the whole thing
 * is one touch target, and pressing again withdraws the vote.
 *
 * It answers the press at once rather than after the round trip: a vote that
 * lands a second later reads as a missed tap, and gets pressed again.
 */
const VoteButton = ({
    count,
    voted,
    onToggle,
    disabledReason,
    noun = "review",
    className,
}: VoteButtonProps) => {
    const disabled = !!disabledReason;
    // What the press said, until the server's answer arrives as new props.
    const [pressed, setPressed] = useState<boolean | null>(null);
    useEffect(() => setPressed(null), [voted, count]);

    const shown = pressed ?? voted;
    const shownCount = count + (shown === voted ? 0 : shown ? 1 : -1);

    const toggle = () => {
        setPressed(!shown);
        Promise.resolve(onToggle()).catch(() => setPressed(null));
    };

    return (
        <button
            type="button"
            onClick={toggle}
            disabled={disabled}
            aria-pressed={shown}
            aria-label={
                disabled
                    ? `${count} upvotes. ${disabledReason}`
                    : shown
                      ? "Remove your upvote"
                      : `Upvote this ${noun}`
            }
            title={disabledReason ?? undefined}
            className={cn(
                "inline-flex min-h-11 items-center gap-1 rounded-full border px-2.5 py-1 text-label-sm transition-colors lift sm:min-h-0",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                shown
                    ? "border-brand bg-brand-subtle text-brand"
                    : "border-subtle text-content-muted hover:border-strong hover:text-content",
                disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                className
            )}
        >
            <ArrowBigUp
                size={15}
                aria-hidden
                className={cn("shrink-0", shown && "fill-brand")}
            />
            <span className="font-mono tabular-nums">{shownCount}</span>
        </button>
    );
};

export default VoteButton;

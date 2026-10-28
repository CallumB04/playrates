import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { formatCount } from "../../lib/format";
import { cn } from "../../lib/cn";

interface LoveButtonProps {
    count: number;
    loved: boolean;
    /** Return the request's promise, and the button takes the love back if
     *  it fails. */
    onToggle: () => unknown;
    /** Set when the viewer cannot love it, and says why. The count still
     *  shows, so a signed-out viewer or the owner can read it. */
    disabledReason?: string | null;
    className?: string;
}

/**
 * A love, for the things that are more than a vote. Bigger than VoteButton
 * and in its own warm colour, with a pop as it fills.
 *
 * Like VoteButton it answers the press at once rather than after the round
 * trip, and puts it back if the request fails.
 */
const LoveButton = ({
    count,
    loved,
    onToggle,
    disabledReason,
    className,
}: LoveButtonProps) => {
    const disabled = !!disabledReason;
    const [pressed, setPressed] = useState<boolean | null>(null);
    useEffect(() => setPressed(null), [loved, count]);
    // Pops only on a press, not when the page arrives already loved.
    const [popped, setPopped] = useState(0);

    const shown = pressed ?? loved;
    const shownCount = count + (shown === loved ? 0 : shown ? 1 : -1);

    const toggle = () => {
        if (!shown) setPopped((n) => n + 1);
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
                    ? `${shownCount} loves. ${disabledReason}`
                    : shown
                      ? `Loved, with ${shownCount}. Press to take it back`
                      : `Love it, with ${shownCount}`
            }
            title={disabledReason ?? undefined}
            className={cn(
                "inline-flex min-h-12 items-center gap-2 rounded-full border px-5 text-body-sm font-semibold transition-colors lift",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-love",
                shown
                    ? "border-love bg-love-quiet text-love-content"
                    : "border-strong bg-surface-raised text-content hover:border-love hover:text-love-content",
                disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer",
                className
            )}
        >
            <Heart
                key={popped}
                size={20}
                aria-hidden
                className={cn(
                    "shrink-0",
                    shown ? "fill-love text-love" : "text-love",
                    popped > 0 && shown && "animate-heart-pop"
                )}
            />
            <span>{shown ? "Loved" : "Love"}</span>
            <span className="font-mono text-content-muted tabular-nums">
                {formatCount(shownCount)}
            </span>
        </button>
    );
};

export default LoveButton;

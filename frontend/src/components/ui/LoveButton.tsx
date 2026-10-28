import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { formatCount } from "../../lib/format";
import { cn } from "../../lib/cn";
import { buttonClass } from "./Button";

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
 * A love, for the things that are more than a vote. Button-sized, to sit
 * with the actions beside it, in its own warm colour, with a pop as it fills.
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
            className={buttonClass(
                "bare",
                cn(
                    "gap-2.5 shadow-lip transition-colors",
                    shown
                        ? "border-love/60 bg-love-quiet text-love-content"
                        : "border-subtle bg-surface-raised text-content",
                    disabled
                        ? "cursor-not-allowed"
                        : "hover:-translate-y-px hover:shadow-plate active:translate-y-0 active:shadow-none",
                    !disabled && !shown && "hover:bg-surface-hover",
                    className
                ),
                "touch"
            )}
        >
            <Heart
                key={popped}
                size={18}
                aria-hidden
                className={cn(
                    "shrink-0 text-love",
                    shown && "fill-love",
                    popped > 0 && shown && "animate-heart-pop"
                )}
            />
            {shown ? "Loved" : "Love"}
            <span
                className={cn(
                    "border-l pl-2.5 tabular-nums",
                    shown
                        ? "border-love/40 text-love-content"
                        : "border-subtle text-content-secondary"
                )}
            >
                {formatCount(shownCount)}
            </span>
        </button>
    );
};

export default LoveButton;

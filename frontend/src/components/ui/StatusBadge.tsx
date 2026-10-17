import { useEffect, useRef, useState } from "react";
import {
    STATUS_PRESENTATION,
    type DisplayStatus,
} from "../../constants/gameStatus";
import { cn } from "../../lib/cn";

export type StatusBadgeSize = "stamp" | "base";

interface StatusBadgeProps {
    status: DisplayStatus;
    size?: StatusBadgeSize;
    /** Over box art: the word on a scrim, the mark in the light end of its
     *  ramp. */
    onMedia?: boolean;
    /** Play the 90ms stamp once when the status actually changes. */
    animateOnChange?: boolean;
    className?: string;
}

const SIZE: Record<StatusBadgeSize, string> = {
    stamp: "gap-1.5 text-[10px] font-semibold",
    base: "gap-1.5 text-xs",
};

/**
 * Eight states told apart by mark, word and hue at once, so the badge still
 * reads with the colour removed. The mark is redundant, so it stays hidden
 * from screen readers.
 *
 * The mark and the word in the status hue, with no pill around them: an
 * outlined, tinted pill on every row read as a sticker rather than as
 * information. Over art the word needs something behind it, so it gets a
 * scrim, still with no rule.
 */
const StatusBadge = ({
    status,
    size = "base",
    onMedia = false,
    animateOnChange = false,
    className,
}: StatusBadgeProps) => {
    const {
        label,
        icon: Mark,
        markTone,
        onMediaTone,
    } = STATUS_PRESENTATION[status];

    const previous = useRef(status);
    const [stamping, setStamping] = useState(false);

    useEffect(() => {
        if (previous.current === status) return;
        previous.current = status;
        if (!animateOnChange) return;
        setStamping(true);
        const id = window.setTimeout(() => setStamping(false), 120);
        return () => window.clearTimeout(id);
    }, [status, animateOnChange]);

    return (
        <span
            className={cn(
                "inline-flex items-center font-medium",
                SIZE[size],
                onMedia
                    ? "rounded-full bg-media-scrim-strong py-[3px] pr-2.5 pl-2 text-content-on-media shadow-cover backdrop-blur-md"
                    : markTone,
                stamping && "animate-stamp",
                className
            )}
        >
            <Mark
                size={size === "stamp" ? 11 : 13}
                strokeWidth={2.25}
                aria-hidden
                className={cn("shrink-0", onMedia && onMediaTone)}
            />
            {label}
        </span>
    );
};

export default StatusBadge;

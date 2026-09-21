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
    /**
     * Drops the rule and the fill, leaving the mark and the word in the
     * status hue. For rows that are already a list of small things, where a
     * pill turns one more piece of metadata into a component.
     */
    plain?: boolean;
    /** The rotated, scrim-backed treatment that sits on box art. */
    onMedia?: boolean;
    /** Play the 90ms stamp once when the status actually changes. */
    animateOnChange?: boolean;
    className?: string;
}

const SIZE: Record<StatusBadgeSize, string> = {
    stamp: "gap-1.5 px-2 py-[3px] text-[10px] font-semibold",
    base: "gap-1.5 px-2.5 py-1 text-xs",
};

/**
 * Eight states told apart by mark, word and hue at once, so the badge still
 * reads with the colour removed. The mark is redundant, so it stays hidden
 * from screen readers.
 */
const StatusBadge = ({
    status,
    size = "base",
    plain = false,
    onMedia = false,
    animateOnChange = false,
    className,
}: StatusBadgeProps) => {
    const {
        label,
        icon: Mark,
        chip,
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
                plain
                    ? cn("gap-1.5 text-xs", markTone)
                    : cn(
                          "rounded-full border",
                          SIZE[size],
                          onMedia
                              ? cn(
                                    onMediaTone,
                                    "bg-media-scrim shadow-cover backdrop-blur-sm"
                                )
                              : chip
                      ),
                stamping && "animate-stamp",
                className
            )}
        >
            <Mark
                size={size === "stamp" ? 11 : 13}
                aria-hidden
                className="shrink-0"
            />
            {label}
        </span>
    );
};

export default StatusBadge;

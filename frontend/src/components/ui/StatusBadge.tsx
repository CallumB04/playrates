import { useEffect, useRef, useState } from "react";
import {
    STATUS_PRESENTATION,
    statusRadius,
    type DisplayStatus,
} from "../../constants/gameStatus";
import { STATUS_MARKS } from "../../lib/marks";
import { cn } from "../../lib/cn";

export type StatusBadgeSize = "stamp" | "base";

interface StatusBadgeProps {
    status: DisplayStatus;
    size?: StatusBadgeSize;
    /** The rotated, scrim-backed treatment that sits on box art. */
    onMedia?: boolean;
    /** Play the 90ms stamp once when the status actually changes. */
    animateOnChange?: boolean;
    className?: string;
}

const SIZE: Record<StatusBadgeSize, string> = {
    stamp: "gap-1.5 px-1.5 py-1 text-stamp",
    base: "gap-1.5 px-2.5 py-1.5 text-label-sm",
};

/**
 * Eight states told apart by shape, word and hue at once — so the badge still
 * reads with the colour removed, and the word is never the thing that gets
 * dropped. The mark is redundant reinforcement and stays hidden from readers.
 *
 * `rounded-*` in className is unsupported: the shape carries meaning.
 */
const StatusBadge = ({
    status,
    size = "base",
    onMedia = false,
    animateOnChange = false,
    className,
}: StatusBadgeProps) => {
    const { label, mark, chip, markTone } = STATUS_PRESENTATION[status];
    const Mark = STATUS_MARKS[mark];

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
                "inline-flex items-center border font-mono uppercase",
                SIZE[size],
                statusRadius(status),
                onMedia
                    ? "border-content-on-media/90 bg-media-scrim text-content-on-media stamp"
                    : chip,
                stamping && "animate-stamp",
                className
            )}
        >
            <Mark className={cn("shrink-0", onMedia ? undefined : markTone)} />
            {label}
        </span>
    );
};

export default StatusBadge;

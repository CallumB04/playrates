import { useId, useRef, useState } from "react";
import type { BadgeDef, Metal } from "@playrates/shared";
import BadgeMedal from "./BadgeMedal";
import { badgeText, nextTier, rarityText } from "./badgeText";
import { useDismiss } from "../../hooks/useDismiss";
import { formatCount } from "../../lib/format";
import { cn } from "../../lib/cn";
import { popoverClass } from "../ui/popover";

/* The medal tokens, which hold up on a light page as the metals don't. */
const METAL_TEXT: Record<Metal, string> = {
    1: "text-medal-bronze",
    2: "text-medal-silver",
    3: "text-medal-gold",
    4: "text-brand",
};

const METAL_LABEL: Record<Metal, string> = {
    1: "Bronze",
    2: "Silver",
    3: "Gold",
    4: "Platinum",
};

interface BadgeTipProps {
    badge: BadgeDef;
    metal: Metal;
    /** Share of members holding it at this metal, 0 to 1. */
    rarity: number;
    /** The count behind it, where the viewer may see it: their own. */
    value?: number;
    className?: string;
}

/**
 * A medal that says what it is: pointed at, focused or tapped, a card opens
 * with what the badge is for, how far it is to the next metal, and how many
 * members hold it. A tap opens it too, since a phone has nothing to point.
 */
const BadgeTip = ({
    badge,
    metal,
    rarity,
    value,
    className,
}: BadgeTipProps) => {
    const [open, setOpen] = useState(false);
    const wrap = useRef<HTMLSpanElement>(null);
    const tipId = useId();
    const closing = useRef<number | undefined>(undefined);
    useDismiss([wrap], () => setOpen(false), { enabled: open, escape: true });

    const next = nextTier(badge, metal);
    const show = () => {
        window.clearTimeout(closing.current);
        setOpen(true);
    };
    // A moment's grace, so the pointer can cross to the card itself.
    const hide = () => {
        closing.current = window.setTimeout(() => setOpen(false), 120);
    };

    return (
        <span
            ref={wrap}
            className={cn("relative inline-block", className)}
            onMouseEnter={show}
            onMouseLeave={hide}
        >
            <button
                type="button"
                // Opens only: a pointer has opened it already by the time it
                // clicks, and a toggle would shut it. Away, or Escape, closes.
                onClick={show}
                onFocus={show}
                onBlur={hide}
                aria-describedby={open ? tipId : undefined}
                aria-label={`${badge.name}, ${METAL_LABEL[metal]}`}
                className="block cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
                <BadgeMedal badge={badge} metal={metal} size="sm" />
            </button>
            {/* From the medal's left edge rather than centred on it: the
                medals start a card's row, and centred, the first one's
                card ran off a phone's screen. */}
            {open && (
                <span
                    id={tipId}
                    role="tooltip"
                    className={popoverClass(
                        "absolute bottom-[calc(100%+0.5rem)] left-0 z-30 block w-60 p-3 text-left"
                    )}
                >
                    <span className="flex items-center gap-2.5">
                        <BadgeMedal badge={badge} metal={metal} size="md" />
                        <span className="min-w-0">
                            <span className="block truncate text-body-sm font-semibold text-content">
                                {badge.name}
                            </span>
                            <span
                                className={cn(
                                    "block font-mono text-[10px] font-bold tracking-wider uppercase",
                                    METAL_TEXT[metal]
                                )}
                            >
                                {METAL_LABEL[metal]}
                            </span>
                        </span>
                    </span>
                    <span className="mt-2 block text-label-sm text-content-secondary">
                        {badgeText(badge, metal)}
                    </span>
                    {next && value !== undefined && (
                        <span className="mt-2.5 block">
                            <span className="flex justify-between font-mono text-[11px] text-content-muted tabular-nums">
                                <span>To {METAL_LABEL[next.metal]}</span>
                                <span>
                                    {formatCount(Math.min(value, next.at))} /{" "}
                                    {formatCount(next.at)}
                                </span>
                            </span>
                            <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-content-muted/25">
                                <span
                                    className="block h-full rounded-full bg-brand"
                                    style={{
                                        width: `${Math.min(100, (value / next.at) * 100)}%`,
                                    }}
                                />
                            </span>
                        </span>
                    )}
                    <span className="mt-2.5 block border-t border-subtle pt-2 text-label-sm text-content-muted">
                        {rarityText(rarity)}
                    </span>
                </span>
            )}
        </span>
    );
};

export default BadgeTip;

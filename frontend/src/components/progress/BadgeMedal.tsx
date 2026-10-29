import { HelpCircle } from "lucide-react";
import { METALS, type BadgeDef, type Metal } from "@playrates/shared";
import { cn } from "../../lib/cn";
import { BADGE_ICONS } from "./badgeIcons";

const SIZES = {
    xs: { box: "size-6", icon: 12 },
    sm: { box: "size-8", icon: 15 },
    md: { box: "size-11", icon: 20 },
    lg: { box: "size-16", icon: 28 },
    xl: { box: "size-28 sm:size-32", icon: 52 },
} as const;

interface BadgeMedalProps {
    badge: BadgeDef;
    /** Null while it's still to earn. */
    metal: Metal | null;
    size?: keyof typeof SIZES;
    /** How far towards the next metal, 0 to 1, drawn round the outside. */
    progress?: number;
    className?: string;
}

/**
 * A badge as a medal: a disc in its metal with the icon on it. Still and
 * plain on purpose; a page holds dozens. One still to earn is a blank in
 * the page's own colours, and a secret one doesn't show its icon. Either
 * can carry a ring of how far it is to the next metal.
 */
const BadgeMedal = ({
    badge,
    metal,
    size = "md",
    progress,
    className,
}: BadgeMedalProps) => {
    const { box, icon } = SIZES[size];
    const locked = metal === null;
    const Icon =
        locked && badge.secret
            ? HelpCircle
            : (BADGE_ICONS[badge.icon] ?? HelpCircle);

    return (
        <span
            aria-hidden
            className={cn(
                "relative inline-grid shrink-0 place-items-center rounded-full",
                `metal-${locked ? "locked" : METALS[metal - 1]}`,
                locked && "border border-dashed border-strong",
                box,
                className
            )}
            style={
                locked
                    ? undefined
                    : {
                          background:
                              "linear-gradient(150deg, var(--metal-hi), var(--metal-mid) 55%, var(--metal-lo))",
                          boxShadow:
                              "inset 0 0 0 1.5px rgba(255,255,255,0.35), 0 2px 6px -3px var(--metal-glow)",
                      }
            }
        >
            <Icon
                size={icon}
                strokeWidth={2.25}
                style={{ color: "var(--metal-ink)" }}
            />
            {progress !== undefined && (
                // Round the outside, so it reads on a metal as on a blank.
                <svg
                    viewBox="0 0 40 40"
                    className="absolute -inset-1 size-[calc(100%+0.5rem)] -rotate-90"
                >
                    <circle
                        cx="20"
                        cy="20"
                        r="19"
                        fill="none"
                        strokeWidth="1.5"
                        className="stroke-surface-sunken"
                    />
                    {progress > 0 && (
                        <circle
                            cx="20"
                            cy="20"
                            r="19"
                            fill="none"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            className="stroke-brand"
                            pathLength={100}
                            strokeDasharray={`${Math.min(100, progress * 100)} 100`}
                        />
                    )}
                </svg>
            )}
        </span>
    );
};

export default BadgeMedal;

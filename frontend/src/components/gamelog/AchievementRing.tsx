import { useId } from "react";

interface AchievementRingProps {
    done: number;
    total: number;
    size?: number;
}

/**
 * A fraction as a shape before it is a number.
 *
 * Gold throughout, swept from the deep end of the mastered hue to its bright
 * one: completing a game is the thing this ring is about, so it wears the
 * colour of having completed one rather than grading itself on a red-to-green
 * ramp that read as a warning at anything under a third.
 */
const AchievementRing = ({ done, total, size = 76 }: AchievementRingProps) => {
    const pct = total > 0 ? Math.min(1, done / total) : 0;
    const radius = 34;
    const circumference = 2 * Math.PI * radius;
    // Gradients are referenced by id, and a page can hold more than one ring.
    const sweep = useId();
    const glow = useId();

    return (
        <div
            className="relative grid shrink-0 place-items-center"
            style={{ width: size, height: size }}
        >
            {/* Visible overflow: the arc runs to 78 of 80, so its glow
                spills past the box and was cut off square. */}
            <svg
                viewBox="0 0 80 80"
                className="size-full -rotate-90 overflow-visible"
            >
                <defs>
                    <linearGradient
                        id={sweep}
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                    >
                        <stop offset="0%" stopColor="var(--status-mastered)" />
                        <stop
                            offset="100%"
                            stopColor="var(--status-mastered-sheen)"
                        />
                    </linearGradient>
                    {/* Not CSS drop-shadow, which only draws a tenth past
                        the arc's own box and squared off its glow. This
                        region covers the whole ring and the blur around it,
                        whatever length the arc is. */}
                    <filter
                        id={glow}
                        filterUnits="userSpaceOnUse"
                        x="-12"
                        y="-12"
                        width="104"
                        height="104"
                    >
                        <feDropShadow
                            dx="0"
                            dy="0"
                            stdDeviation="3"
                            className="[flood-color:color-mix(in_srgb,var(--status-mastered)_45%,transparent)]"
                        />
                    </filter>
                </defs>

                <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-surface-sunken"
                />
                <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    fill="none"
                    stroke={`url(#${sweep})`}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - pct)}
                    filter={`url(#${glow})`}
                    className="transition-[stroke-dashoffset] duration-700 ease-[var(--ease-glide)]"
                />
            </svg>
            <span className="absolute font-mono text-figure-row text-content">
                {Math.round(pct * 100)}%
            </span>
        </div>
    );
};

export default AchievementRing;

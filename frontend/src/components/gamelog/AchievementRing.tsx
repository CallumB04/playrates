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

    return (
        <div
            className="relative grid shrink-0 place-items-center"
            style={{ width: size, height: size }}
        >
            <svg viewBox="0 0 80 80" className="size-full -rotate-90">
                <defs>
                    <linearGradient
                        id={sweep}
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                    >
                        <stop
                            offset="0%"
                            stopColor="var(--status-mastered)"
                        />
                        <stop
                            offset="100%"
                            stopColor="var(--status-mastered-sheen)"
                        />
                    </linearGradient>
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
                    className="transition-[stroke-dashoffset] duration-700 ease-[var(--ease-glide)]"
                    style={{
                        filter: "drop-shadow(0 0 6px color-mix(in srgb, var(--status-mastered) 45%, transparent))",
                    }}
                />
            </svg>
            <span className="absolute font-mono text-figure-row text-content">
                {Math.round(pct * 100)}%
            </span>
        </div>
    );
};

export default AchievementRing;

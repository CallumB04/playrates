import { cn } from "../../lib/cn";

/* A ramp rather than one colour, so the ring says roughly where you are before
   you read the figure. Gold at the top ties it to the mastered status. */
const toneFor = (pct: number): string => {
    if (pct >= 1) return "text-gold";
    if (pct >= 0.66) return "text-success";
    if (pct >= 0.33) return "text-warning";
    return "text-danger";
};

interface AchievementRingProps {
    done: number;
    total: number;
    size?: number;
}

/** A fraction as a shape before it is a number. */
const AchievementRing = ({ done, total, size = 76 }: AchievementRingProps) => {
    const pct = total > 0 ? Math.min(1, done / total) : 0;
    const radius = 34;
    const circumference = 2 * Math.PI * radius;

    return (
        <div
            className="relative grid shrink-0 place-items-center"
            style={{ width: size, height: size }}
        >
            <svg viewBox="0 0 80 80" className="size-full -rotate-90">
                <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="7"
                    className="text-surface-sunken"
                />
                <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - pct)}
                    className={cn(
                        "transition-[stroke-dashoffset,color] duration-700 ease-[var(--ease-glide)]",
                        toneFor(pct)
                    )}
                />
            </svg>
            <span className="absolute font-mono text-figure-row text-content">
                {Math.round(pct * 100)}%
            </span>
        </div>
    );
};

export default AchievementRing;

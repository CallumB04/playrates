import { useId } from "react";
import { completionTone } from "../../lib/completionTone";

interface AchievementRingProps {
    done: number;
    total: number;
    size?: number;
    /** No figure inside and no glow, and a band thick enough to read at
     *  the size of a word: beside a figure that already says it. */
    bare?: boolean;
}

/**
 * A fraction as a shape before it is a number, in its band's colour: red,
 * orange and green on the way, and gold, swept to its bright end, once
 * every achievement is in.
 */
const AchievementRing = ({
    done,
    total,
    size = 76,
    bare = false,
}: AchievementRingProps) => {
    const pct = total > 0 ? Math.min(1, done / total) : 0;
    // Bare, a broader band than the ring's, as it sits at the size of a word.
    const stroke = bare ? 14 : 8;
    const radius = 40 - stroke / 2 - (bare ? 0 : 2);
    const circumference = 2 * Math.PI * radius;
    // Gradients are referenced by id, and a page can hold more than one ring.
    const sweep = useId();
    const glow = useId();
    const tone = completionTone(pct);

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
                        <stop offset="0%" stopColor={tone.colour} />
                        <stop offset="100%" stopColor={tone.sheen} />
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
                        {/* A style, not the attribute: an attribute can't
                            read a CSS variable. */}
                        <feDropShadow
                            dx="0"
                            dy="0"
                            stdDeviation="3"
                            style={{
                                floodColor: `color-mix(in srgb, ${tone.colour} 45%, transparent)`,
                            }}
                        />
                    </filter>
                </defs>

                <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={stroke}
                    // On a card, sunken all but vanishes by night; the
                    // small ring has no figure inside to show its extent.
                    className={bare ? "text-strong" : "text-surface-sunken"}
                />
                <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    fill="none"
                    stroke={`url(#${sweep})`}
                    strokeWidth={stroke}
                    strokeLinecap={bare ? "butt" : "round"}
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - pct)}
                    filter={bare ? undefined : `url(#${glow})`}
                    className="transition-[stroke-dashoffset] duration-700 ease-[var(--ease-glide)]"
                />
            </svg>
            {!bare && (
                <span className="absolute font-mono text-figure-row text-content">
                    {Math.round(pct * 100)}%
                </span>
            )}
        </div>
    );
};

export default AchievementRing;

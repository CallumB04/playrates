import { useEffect, useRef, useState } from "react";
import { formatCount } from "../../lib/format";
import { cn } from "../../lib/cn";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

export type FigureSize = "display" | "lg" | "row" | "label";

const SIZE: Record<FigureSize, string> = {
    display: "text-figure",
    /** A stat on a card: the game page's score cards, a profile's counts. */
    lg: "text-figure-lg",
    row: "text-figure-row",
    label: "text-figure-sm",
};

/** The figure's type, for a value that is not a plain number — a rating
 *  badge, "31h", a skeleton standing in for either. */
export const figureClass = (size: FigureSize = "row", className?: string) =>
    cn("font-mono text-content tabular-nums", SIZE[size], className);

const DURATION = 320;
const easeOut = (t: number): number => 1 - (1 - t) ** 3;

/** Counts up when the value changes. Swaps straight to the target under
 *  reduced motion. */
export const useFigureRoll = (target: number, enabled: boolean): number => {
    const reduced = usePrefersReducedMotion();
    const [value, setValue] = useState(target);
    const from = useRef(target);

    useEffect(() => {
        if (!enabled || reduced) {
            from.current = target;
            setValue(target);
            return;
        }

        const start = performance.now();
        const origin = from.current;
        let frame = 0;

        const step = (now: number) => {
            const t = Math.min(1, (now - start) / DURATION);
            setValue(origin + (target - origin) * easeOut(t));
            if (t < 1) frame = requestAnimationFrame(step);
            else from.current = target;
        };

        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
    }, [target, enabled, reduced]);

    return value;
};

interface FigureProps {
    value: number;
    format?: (value: number) => string;
    size?: FigureSize;
    /** Count up on change — the 320ms figure roll. */
    roll?: boolean;
    className?: string;
}

const Figure = ({
    value,
    format = formatCount,
    size = "row",
    roll = false,
    className,
}: FigureProps) => {
    const rolled = useFigureRoll(value, roll);
    return (
        <span
            // A counting number must never be announced on every frame.
            aria-live="off"
            className={figureClass(size, className)}
        >
            {format(roll ? Math.round(rolled) : value)}
        </span>
    );
};

export default Figure;

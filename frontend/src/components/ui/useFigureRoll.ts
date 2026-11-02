import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

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

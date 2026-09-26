import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { barIndexAt } from "../lib/plot";

/**
 * Which point of a plot is being read. The latest until a pointer, a finger
 * or the arrow keys pick another; a mouse leaving hands it back, a finger
 * lifting keeps its choice, since there is no hover to fall back on.
 */
export const usePlotCursor = <T extends HTMLElement>(count: number) => {
    const latest = Math.max(0, count - 1);
    const [picked, setPicked] = useState<number | null>(null);
    const ref = useRef<T>(null);
    const index = Math.min(picked ?? latest, latest);

    const pickAt = (event: PointerEvent<T>) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        setPicked(barIndexAt(event.clientX - rect.left, rect.width, count));
    };

    const onKeyDown = (event: KeyboardEvent<T>) => {
        const step: Record<string, number> = {
            ArrowLeft: index - 1,
            ArrowRight: index + 1,
            Home: 0,
            End: latest,
        };
        if (!(event.key in step)) return;
        event.preventDefault();
        setPicked(Math.min(latest, Math.max(0, step[event.key]!)));
    };

    return {
        index,
        ref,
        handlers: {
            onPointerMove: pickAt,
            onPointerDown: pickAt,
            onPointerLeave: (e: PointerEvent<T>) => e.pointerType === "mouse" && setPicked(null),
            onBlur: () => setPicked(null),
            onKeyDown,
        },
    };
};

/** The slider semantics a plot takes so assistive tech can step through it. */
export const sliderProps = (label: string, index: number, count: number, text: string) => ({
    role: "slider" as const,
    tabIndex: 0,
    "aria-label": label,
    "aria-valuemin": 0,
    "aria-valuemax": Math.max(0, count - 1),
    "aria-valuenow": index,
    "aria-valuetext": count > 0 ? text : "No data",
});

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import RatingBadge from "./RatingBadge";
import { formatRating } from "../../lib/format";
import { cn } from "../../lib/cn";

const MAX = 10;
const STEP = 0.5;
const MIN = STEP; // Zero is not the bottom of the scale, it is no rating.
const SEGMENTS = MAX / STEP; // 20, one per allowed value

const clamp = (value: number): number =>
    Math.min(MAX, Math.max(MIN, Math.round(value / STEP) * STEP));

interface RatingMeterProps {
    value: number | null;
    onChange: (value: number | null) => void;
    /** Labels the control for assistive tech, e.g. "Your rating". */
    label: string;
    disabled?: boolean;
    className?: string;
}

/**
 * Twenty segments, one per allowed rating. A segment either fills or it
 * doesn't, so a half point is a clean unit rather than half a star.
 */
const RatingMeter = ({
    value,
    onChange,
    label,
    disabled = false,
    className,
}: RatingMeterProps) => {
    const [hover, setHover] = useState<number | null>(null);
    const [dragging, setDragging] = useState(false);
    const trackRef = useRef<HTMLDivElement>(null);
    const shown = hover ?? value ?? 0;
    const filled = Math.round(shown / STEP);

    const set = (next: number) => {
        if (disabled) return;
        // Pressing the current value again clears it.
        onChange(next === value ? null : next);
    };

    /* A segment is 11px wide, which no fingertip can pick out, so a coarse
       pointer slides along the whole track instead. A mouse keeps the
       per-segment buttons. */
    const valueAt = (clientX: number): number => {
        const el = trackRef.current;
        if (!el) return MIN;
        const { left, width } = el.getBoundingClientRect();
        const index = Math.ceil(((clientX - left) / width) * SEGMENTS);
        return clamp(Math.min(SEGMENTS, Math.max(1, index)) * STEP);
    };

    const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
        if (disabled || event.pointerType === "mouse") return;
        // Stops the synthetic click that would otherwise set it a second time.
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
        setHover(valueAt(event.clientX));
    };

    const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
        if (!dragging) return;
        setHover(valueAt(event.clientX));
    };

    const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
        if (!dragging) return;
        setDragging(false);
        setHover(null);
        set(valueAt(event.clientX));
    };

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (disabled) return;
        const nudge = (delta: number) => {
            event.preventDefault();
            // From nothing, a nudge up starts at the bottom of the scale
            // rather than at 0.5 above it.
            onChange(value === null ? MIN : clamp(value + delta));
        };
        switch (event.key) {
            case "ArrowRight":
            case "ArrowUp":
                return nudge(STEP);
            case "ArrowLeft":
            case "ArrowDown":
                return nudge(-STEP);
            case "PageUp":
                return nudge(1);
            case "PageDown":
                return nudge(-1);
            case "Home":
                event.preventDefault();
                return onChange(MIN);
            case "End":
                event.preventDefault();
                return onChange(MAX);
            case "Backspace":
            case "Delete":
                event.preventDefault();
                return onChange(null);
        }
    };

    return (
        <div className={cn("flex flex-col gap-2.5", className)}>
            <div className="flex items-baseline justify-between gap-4">
                <span className="text-label text-content-muted">{label}</span>
                <RatingBadge
                    value={hover ?? value}
                    size="md"
                    className="shrink-0"
                />
            </div>

            <div
                role="slider"
                aria-label={label}
                aria-valuemin={MIN}
                aria-valuemax={MAX}
                aria-valuenow={value ?? undefined}
                aria-valuetext={
                    value === null ? "Not rated" : formatRating(value)
                }
                aria-disabled={disabled || undefined}
                tabIndex={disabled ? -1 : 0}
                ref={trackRef}
                onKeyDown={onKeyDown}
                onPointerLeave={() => !dragging && setHover(null)}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={() => {
                    setDragging(false);
                    setHover(null);
                }}
                className={cn(
                    "flex h-14 w-full touch-none gap-[3px] rounded-sm select-none sm:h-9",
                    "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand",
                    disabled && "pointer-events-none opacity-60"
                )}
            >
                {Array.from({ length: SEGMENTS }, (_, i) => {
                    const step = (i + 1) * STEP;
                    const on = i < filled;
                    return (
                        <button
                            key={step}
                            type="button"
                            tabIndex={-1}
                            aria-label={`${formatRating(step)} out of 10`}
                            onPointerEnter={() => setHover(step)}
                            onClick={() => set(step)}
                            className={cn(
                                "h-full flex-1 cursor-pointer rounded-xs transition-colors duration-150",
                                // Whole points sit a shade darker, so the scale
                                // is readable without printing ten numbers.
                                on
                                    ? step % 1 === 0
                                        ? "bg-brand"
                                        : "bg-brand/70"
                                    : "bg-surface-sunken hover:bg-surface-hover",
                                i === 0 && "rounded-l-sm",
                                i === SEGMENTS - 1 && "rounded-r-sm"
                            )}
                        />
                    );
                })}
            </div>

            <p className="text-label-sm text-content-muted">
                <span className="sm:hidden">
                    Slide to change, and land on the same value again to clear
                    your rating.
                </span>
                <span className="hidden sm:inline">
                    Press the same segment again to clear your rating.
                </span>
            </p>
        </div>
    );
};

export default RatingMeter;

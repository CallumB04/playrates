import { useState, type KeyboardEvent } from "react";
import RatingBadge from "./RatingBadge";
import { formatRating } from "../../lib/format";
import { cn } from "../../lib/cn";

const MAX = 10;
const STEP = 0.5;
const SEGMENTS = MAX / STEP; // 20, one per allowed value

const clamp = (value: number): number =>
    Math.min(MAX, Math.max(0, Math.round(value / STEP) * STEP));

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
    const shown = hover ?? value ?? 0;
    const filled = Math.round(shown / STEP);

    const set = (next: number) => {
        if (disabled) return;
        // Pressing the current value again clears it.
        onChange(next === value ? null : next);
    };

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (disabled) return;
        const nudge = (delta: number) => {
            event.preventDefault();
            onChange(clamp((value ?? 0) + delta));
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
                return onChange(0);
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
                aria-valuemin={0}
                aria-valuemax={MAX}
                aria-valuenow={value ?? undefined}
                aria-valuetext={
                    value === null ? "Not rated" : formatRating(value)
                }
                aria-disabled={disabled || undefined}
                tabIndex={disabled ? -1 : 0}
                onKeyDown={onKeyDown}
                onPointerLeave={() => setHover(null)}
                className={cn(
                    "flex h-9 w-full gap-[3px] rounded-sm",
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
                Half points count. Press the same segment again to clear it.
            </p>
        </div>
    );
};

export default RatingMeter;

import { useCallback, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { formatRating } from "../../lib/format";
import { cn } from "../../lib/cn";

const MAX = 10;
const STEP = 0.25; // 40 detents, matching the rating CHECK on game_logs

const clampToStep = (value: number): number =>
    Math.min(MAX, Math.max(0, Math.round(value / STEP) * STEP));

interface RatingRuleProps {
    value: number | null;
    onChange: (value: number | null) => void;
    /** Labels the slider for assistive tech, e.g. "Your rating". */
    label: string;
    disabled?: boolean;
    className?: string;
}

/**
 * The 40-detent setter. A recessed rule you press a marker into — thumb-sized
 * on touch, where it gets taller rather than smaller.
 *
 * Real slider semantics rather than a styled input[type=range], because the
 * track needs the deboss and the tick gradients; keyboard support is therefore
 * explicit.
 */
const RatingRule = ({
    value,
    onChange,
    label,
    disabled = false,
    className,
}: RatingRuleProps) => {
    const trackRef = useRef<HTMLDivElement>(null);
    const current = value ?? 0;
    const percent = (current / MAX) * 100;

    const setFromPointer = useCallback(
        (clientX: number) => {
            const track = trackRef.current;
            if (!track) return;
            const { left, width } = track.getBoundingClientRect();
            if (width === 0) return;
            onChange(clampToStep(((clientX - left) / width) * MAX));
        },
        [onChange]
    );

    const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
        if (disabled) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        setFromPointer(event.clientX);
    };

    const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
        if (disabled || !event.currentTarget.hasPointerCapture(event.pointerId))
            return;
        setFromPointer(event.clientX);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (disabled) return;
        const nudge = (delta: number) => {
            event.preventDefault();
            onChange(clampToStep(current + delta));
        };
        // Both spellings: some assistive tech and older engines still send the
        // legacy "Right"/"Up" names rather than the "Arrow…" ones.
        switch (event.key) {
            case "ArrowRight":
            case "Right":
            case "ArrowUp":
            case "Up":
                return nudge(STEP);
            case "ArrowLeft":
            case "Left":
            case "ArrowDown":
            case "Down":
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
            <div className="relative">
                <div
                    ref={trackRef}
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
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onKeyDown={handleKeyDown}
                    className={cn(
                        "relative h-11 touch-none overflow-hidden border border-strong bg-surface-sunken inset-shadow-field sm:h-[22px]",
                        "focus-visible:border-brand focus-visible:outline-none",
                        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                    )}
                >
                    {value !== null && (
                        <span
                            className="absolute inset-y-0 left-0 bg-brand-subtle"
                            style={{ width: `${percent}%` }}
                        />
                    )}
                    {/* Ticks sit above the fill, or the fill hides them. */}
                    <span className="detent-rule absolute inset-0" />
                </div>
                {value !== null && (
                    <span
                        className="pointer-events-none absolute -top-1.5 h-11 w-[3px] -translate-x-1/2 bg-brand sm:h-8"
                        style={{ left: `${percent}%` }}
                    />
                )}
            </div>
            <div className="flex items-baseline justify-between font-mono text-label-sm uppercase text-content-muted">
                <span>{label}</span>
                <span className="text-figure-sm text-brand">
                    {formatRating(value)}
                </span>
            </div>
        </div>
    );
};

export default RatingRule;

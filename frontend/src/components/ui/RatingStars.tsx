import { useState, type KeyboardEvent } from "react";
import { Star } from "lucide-react";
import { formatRating } from "../../lib/format";
import { cn } from "../../lib/cn";

const MAX = 10;
const STEP = 0.5;

interface RatingStarsProps {
    value: number | null;
    onChange: (value: number | null) => void;
    /** Labels the control for assistive tech, e.g. "Your rating". */
    label: string;
    disabled?: boolean;
    className?: string;
}

const clamp = (value: number): number =>
    Math.min(MAX, Math.max(0, Math.round(value / STEP) * STEP));

/**
 * Ten stars, each half-clickable.
 *
 * This replaced a bare 40-detent rule. The problem with the rule was not the
 * precision so much as that it gave you nothing to aim at: the value only
 * appeared once you had already committed to a position, so setting "8" meant
 * dragging and checking. Ten stars at half steps land on exactly the twenty
 * values the column allows, and the figure updates as you sweep, so you can
 * see what you are about to pick before you pick it.
 */
const RatingStars = ({
    value,
    onChange,
    label,
    disabled = false,
    className,
}: RatingStarsProps) => {
    const [hover, setHover] = useState<number | null>(null);
    const shown = hover ?? value ?? 0;

    const set = (next: number) => {
        if (disabled) return;
        // Pressing the current value again clears it, so a rating is undoable
        // without a separate control.
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
        <div className={cn("flex flex-col gap-2", className)}>
            <div className="flex items-center justify-between gap-4">
                <span className="text-label text-content-muted">{label}</span>
                <span
                    className={cn(
                        "font-mono text-figure-lg tabular-nums",
                        shown > 0 ? "text-brand" : "text-content-muted"
                    )}
                >
                    {hover !== null || value !== null
                        ? formatRating(shown)
                        : "Not rated"}
                </span>
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
                    /* Fixed-size stars, not flex-1: stretched across a panel
                       they became 50px each and dominated the form. */
                    "flex flex-wrap gap-1 rounded-sm py-1",
                    "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand",
                    disabled && "pointer-events-none opacity-60"
                )}
            >
                {Array.from({ length: MAX }, (_, i) => {
                    const whole = i + 1;
                    const half = whole - STEP;
                    // How much of this star the current value fills.
                    const fill = Math.max(0, Math.min(1, shown - i));

                    return (
                        <span key={whole} className="relative size-8 shrink-0 sm:size-9">
                            <span className="relative block size-full">
                                <Star
                                    aria-hidden
                                    className="absolute inset-0 size-full text-border-strong"
                                    strokeWidth={1.5}
                                />
                                {/* The filled copy is clipped to the fraction,
                                    which is what makes a half read as a half
                                    rather than as a different icon. The inner
                                    star sizes off its own square ratio, so the
                                    clip never has to be divided back out. */}
                                {fill > 0 && (
                                    <span
                                        aria-hidden
                                        className="absolute inset-y-0 left-0 overflow-hidden"
                                        style={{ width: `${fill * 100}%` }}
                                    >
                                        <Star
                                            className="absolute inset-y-0 left-0 h-full w-auto fill-brand text-brand"
                                            strokeWidth={1.5}
                                        />
                                    </span>
                                )}
                            </span>

                            {/* Two hit areas per star: left sets the half. */}
                            <button
                                type="button"
                                tabIndex={-1}
                                aria-label={`${formatRating(half)} out of 10`}
                                onPointerEnter={() => setHover(half)}
                                onClick={() => set(half)}
                                className="absolute inset-y-0 left-0 w-1/2 cursor-pointer"
                            />
                            <button
                                type="button"
                                tabIndex={-1}
                                aria-label={`${formatRating(whole)} out of 10`}
                                onPointerEnter={() => setHover(whole)}
                                onClick={() => set(whole)}
                                className="absolute inset-y-0 right-0 w-1/2 cursor-pointer"
                            />
                        </span>
                    );
                })}
            </div>

            <p className="text-label-sm text-content-muted">
                Half stars count. Press the same star again to clear it.
            </p>
        </div>
    );
};

export default RatingStars;

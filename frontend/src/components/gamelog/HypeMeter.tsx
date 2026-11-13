import { useState, type KeyboardEvent } from "react";
import { HYPE_MAX } from "@playrates/shared";
import { Flame } from "lucide-react";
import { HYPE_LEVELS, hypeLabel } from "./hype";
import { cn } from "../../lib/cn";

interface HypeMeterProps {
    value: number | null;
    /** Named in the question, while it loads too. */
    gameTitle?: string;
    onChange: (value: number | null) => void;
    disabled?: boolean;
    className?: string;
}

/**
 * Five flames for how much you want to play a game on your backlog. Each is
 * a finger's width on a phone, so a tap is enough; pressing the same one
 * again puts them all out.
 */
const HypeMeter = ({
    value,
    gameTitle,
    onChange,
    disabled = false,
    className,
}: HypeMeterProps) => {
    const [hover, setHover] = useState<number | null>(null);
    const shown = hover ?? value ?? 0;
    const question = `How hyped are you to play ${gameTitle ?? "it"}?`;

    const set = (next: number) => {
        if (disabled) return;
        onChange(next === value ? null : next);
    };

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (disabled) return;
        const to = (next: number | null) => {
            event.preventDefault();
            onChange(next);
        };
        const now = value ?? 0;
        switch (event.key) {
            case "ArrowRight":
            case "ArrowUp":
                return to(Math.min(HYPE_MAX, now + 1));
            case "ArrowLeft":
            case "ArrowDown":
                return to(now <= 1 ? null : now - 1);
            case "Home":
                return to(1);
            case "End":
                return to(HYPE_MAX);
            case "Backspace":
            case "Delete":
                return to(null);
        }
    };

    return (
        <div className={cn("flex flex-col gap-2.5", className)}>
            <span className="text-label text-content-muted">{question}</span>

            <div
                role="slider"
                aria-label={question}
                aria-valuemin={0}
                aria-valuemax={HYPE_MAX}
                aria-valuenow={value ?? 0}
                aria-valuetext={value === null ? "No hype" : hypeLabel(value)}
                aria-disabled={disabled || undefined}
                tabIndex={disabled ? -1 : 0}
                onKeyDown={onKeyDown}
                onPointerLeave={() => setHover(null)}
                className={cn(
                    "flex w-max gap-1 rounded-sm",
                    "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand",
                    disabled && "pointer-events-none opacity-60"
                )}
            >
                {HYPE_LEVELS.map((level) => {
                    const lit = level <= shown;
                    return (
                        <button
                            key={level}
                            type="button"
                            tabIndex={-1}
                            aria-label={hypeLabel(level)}
                            onPointerEnter={(event) =>
                                event.pointerType === "mouse" && setHover(level)
                            }
                            onClick={() => set(level)}
                            className={cn(
                                "grid size-12 cursor-pointer place-items-center rounded-md transition-colors duration-150 sm:size-10",
                                lit
                                    ? "bg-accent-quiet text-accent"
                                    : "text-content-muted/60 hover:bg-surface-hover"
                            )}
                        >
                            <Flame
                                aria-hidden
                                strokeWidth={lit ? 1.75 : 1.5}
                                className={cn(
                                    "size-7 sm:size-6",
                                    lit && "fill-current"
                                )}
                            />
                        </button>
                    );
                })}
            </div>

            <p className="text-label-sm text-content-muted">
                Press the same flame again to clear it.
            </p>
        </div>
    );
};

export default HypeMeter;

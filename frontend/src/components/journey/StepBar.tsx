import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";

interface StepBarProps {
    label: string;
    /** Each step's name, said under its segment. */
    steps: readonly string[];
    icons?: readonly LucideIcon[];
    /** How many are done, from the first. */
    done: number;
    className?: string;
}

/**
 * The welcome's steps as one bar in segments, each named underneath so
 * it's clear what's coming, by its mark on a phone and its word with
 * room: the ones done filled and ticked, the one under way half lit, the
 * rest still to come.
 */
const StepBar = ({ label, steps, icons, done, className }: StepBarProps) => (
    <ol aria-label={label} className={cn("flex gap-1 sm:gap-1.5", className)}>
        {steps.map((name, i) => {
            const state = i < done ? "done" : i === done ? "now" : "next";
            const Icon = icons?.[i];
            return (
                <li
                    key={name}
                    aria-current={state === "now" ? "step" : undefined}
                    className="flex min-w-0 flex-1 flex-col gap-1.5"
                >
                    <span className="h-1.5 overflow-hidden rounded-full bg-content-muted/20">
                        <span
                            className={cn(
                                "block h-full origin-left rounded-full bg-brand transition-[transform,opacity] duration-500 ease-(--ease-out-strong)",
                                state === "done"
                                    ? "scale-x-100"
                                    : state === "now"
                                      ? "scale-x-100 opacity-35"
                                      : "scale-x-0"
                            )}
                        />
                    </span>
                    {/* A phone has room for a mark under each, not a word;
                        with room, the word alone reads cleaner than both. */}
                    <span
                        className={cn(
                            "flex min-w-0 items-center justify-center text-[11px] leading-none font-medium sm:justify-start",
                            state === "now"
                                ? "text-brand-text sm:text-content"
                                : state === "done"
                                  ? "text-brand-text sm:text-content-secondary"
                                  : "text-content-muted"
                        )}
                    >
                        {Icon && (
                            <Icon
                                size={14}
                                strokeWidth={state === "next" ? 1.75 : 2.25}
                                aria-hidden
                                className="shrink-0 sm:hidden"
                            />
                        )}
                        <span
                            className={cn("truncate", Icon && "max-sm:sr-only")}
                        >
                            {name}
                        </span>
                        <span className="sr-only">
                            {state === "done"
                                ? ", done"
                                : state === "now"
                                  ? ", now"
                                  : ""}
                        </span>
                    </span>
                </li>
            );
        })}
    </ol>
);

export default StepBar;

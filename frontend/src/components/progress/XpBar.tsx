import type { LevelState } from "@playrates/shared";
import { useFigureRoll } from "../ui/Figure";
import { formatCount } from "../../lib/format";
import { cn } from "../../lib/cn";

interface XpBarProps {
    level: LevelState;
    /** Says the numbers under the bar. */
    labelled?: boolean;
    size?: "sm" | "md";
    className?: string;
}

/** Progress through a level, the fill lit from within. */
const XpBar = ({
    level,
    labelled = true,
    size = "md",
    className,
}: XpBarProps) => {
    const into = useFigureRoll(level.xp - level.floor, true);
    const span = level.next === null ? null : level.next - level.floor;
    return (
        <div className={cn("min-w-0", className)}>
            <div
                role="progressbar"
                aria-label={`Level ${level.level} progress`}
                aria-valuemin={0}
                aria-valuemax={span ?? 1}
                aria-valuenow={span === null ? 1 : level.xp - level.floor}
                className={cn(
                    "relative overflow-hidden rounded-full bg-surface-sunken inset-shadow-press",
                    size === "sm" ? "h-1.5" : "h-2.5"
                )}
            >
                <span
                    className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-brand-deep via-brand to-accent shadow-glow transition-[width] duration-700 ease-out"
                    style={{ width: `${Math.max(2, level.progress * 100)}%` }}
                />
            </div>
            {labelled && (
                <p className="mt-1.5 flex justify-between font-mono text-label-sm text-content-muted tabular-nums">
                    <span>
                        {span === null
                            ? `${formatCount(level.xp)} XP`
                            : `${formatCount(Math.round(into))} / ${formatCount(span)} XP`}
                    </span>
                    {span !== null && <span>Level {level.level + 1}</span>}
                </p>
            )}
        </div>
    );
};

export default XpBar;

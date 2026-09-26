import { ArrowDownRight, ArrowUpRight, Minus, Sparkles } from "lucide-react";
import type { AdminPeriodFigure } from "@playrates/shared";
import { cn } from "../../../lib/cn";
import { changeDirection, formatChange } from "../lib/adminFormat";

const LOOK = {
    up: { icon: ArrowUpRight, className: "bg-success-subtle text-success-content" },
    new: { icon: Sparkles, className: "bg-success-subtle text-success-content" },
    down: { icon: ArrowDownRight, className: "bg-danger-subtle text-danger-content" },
    flat: { icon: Minus, className: "bg-surface-sunken text-content-muted" },
};

/** Change on the previous period. Every figure on the dashboard is one where
 *  more is better, so up is always the good colour; the arrow says it too, so
 *  colour is never the only signal. */
const DeltaChip = ({
    figure,
    className,
}: {
    figure: AdminPeriodFigure;
    className?: string;
}) => {
    const direction = changeDirection(figure);
    const { icon: Icon, className: tone } = LOOK[direction];
    return (
        <span
            className={cn(
                "inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 font-mono text-label-sm tabular-nums",
                tone,
                className
            )}
        >
            <Icon size={12} aria-hidden />
            {formatChange(figure)}
        </span>
    );
};

export default DeltaChip;

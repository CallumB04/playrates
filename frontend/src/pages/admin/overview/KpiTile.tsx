import type { ReactNode } from "react";
import { Maximize2, type LucideIcon } from "lucide-react";
import type { AdminPeriodFigure } from "@playrates/shared";
import Figure from "../../../components/ui/Figure";
import { cardClass } from "../../../components/ui/Card";
import { cn } from "../../../lib/cn";
import DeltaChip from "../charts/DeltaChip";
import { Sparkline } from "../charts/charts";

interface KpiTileProps {
    label: string;
    icon: LucideIcon;
    value: number;
    /** The period's own figure, compared with the one before, and a line
     *  saying what it counted. */
    period?: { figure: AdminPeriodFigure; text: string };
    trend?: number[];
    footnote?: ReactNode;
    onOpen: () => void;
}

/** A headline number that opens into the detail behind it. The whole tile is
 *  the button, and says so with a standing mark rather than a hover. */
const KpiTile = ({
    label,
    icon: Icon,
    value,
    period,
    trend,
    footnote,
    onOpen,
}: KpiTileProps) => (
    <button
        type="button"
        onClick={onOpen}
        className={cn(
            cardClass("group flex min-w-0 cursor-pointer flex-col gap-3 text-left lift"),
            "hover:border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        )}
    >
        <span className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-label text-content-secondary">
                <Icon size={15} aria-hidden className="text-content-muted" />
                {label}
            </span>
            <Maximize2
                size={14}
                aria-hidden
                className="text-content-muted transition-colors group-hover:text-content"
            />
        </span>

        <span className="flex items-end justify-between gap-3">
            <Figure value={value} size="lg" roll />
            {trend && (
                <Sparkline
                    values={trend}
                    label={`${label} per day`}
                    className="mb-1 shrink-0"
                />
            )}
        </span>

        {period && (
            <span className="flex flex-wrap items-center gap-2 text-label-sm text-content-secondary">
                <DeltaChip figure={period.figure} />
                <span>{period.text}</span>
            </span>
        )}

        {footnote && (
            <span className="text-label-sm text-content-muted">{footnote}</span>
        )}
    </button>
);

export default KpiTile;

import type { ReactNode } from "react";
import { Maximize2 } from "lucide-react";
import { cardClass } from "../../../components/ui/Card";
import { figureClass } from "../../../components/ui/Figure";
import { cn } from "../../../lib/cn";

/**
 * One figure, the chart behind it, and the popup that expands them. The whole
 * card opens it: a single button is stretched over the card rather than
 * wrapping it, so the card can hold lists and charts, and a screen reader
 * hears "Open total users" rather than everything inside. The expand mark
 * stands rather than appearing on hover.
 */
const InsightCard = ({
    label,
    value,
    note,
    children,
    onOpen,
    size = "minor",
    className,
}: {
    label: string;
    value?: ReactNode;
    /** Beside the figure: what it has done lately. */
    note?: ReactNode;
    /** The chart, or whatever stands for it. */
    children?: ReactNode;
    onOpen: () => void;
    /** "key" for the headline three: a display figure and a taller chart. */
    size?: "key" | "minor";
    className?: string;
}) => (
    <section
        className={cn(
            cardClass(
                "group relative flex min-w-0 flex-col lift hover:-translate-y-px hover:border-strong hover:shadow-lifted"
            ),
            className
        )}
    >
        <div className="flex items-start justify-between gap-3">
            <h2 className="text-label text-content-secondary">{label}</h2>
            <Maximize2
                size={14}
                aria-hidden
                className="mt-0.5 shrink-0 text-content-muted transition-colors group-hover:text-brand"
            />
        </div>
        {/* Until the headline three sit side by side, each lays its figure
            beside its chart, so all three fit on a phone's first screen. The
            chart under a figure keeps to the foot of the card, so a row's
            charts line up however their labels wrap. */}
        <div
            className={cn(
                "flex flex-1 flex-col",
                size === "key" &&
                    "mt-3 grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] items-end gap-4 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] lg:mt-0 lg:flex lg:items-stretch lg:gap-0"
            )}
        >
            {value !== undefined && (
                <p
                    className={cn(
                        "flex gap-x-2.5 gap-y-1",
                        size === "key"
                            ? "flex-col self-center lg:mt-2 lg:flex-row lg:flex-wrap lg:items-baseline lg:self-auto"
                            : "mt-2 flex-wrap items-baseline"
                    )}
                >
                    <span
                        className={figureClass(
                            size === "key" ? "display" : "lg"
                        )}
                    >
                        {value}
                    </span>
                    {note && (
                        <span className="text-label text-content-muted">
                            {note}
                        </span>
                    )}
                </p>
            )}
            {children && (
                <div
                    className={cn(
                        "min-w-0",
                        size === "key"
                            ? "lg:mt-auto lg:pt-5"
                            : value !== undefined
                              ? "mt-auto pt-4"
                              : "mt-4"
                    )}
                >
                    {children}
                </div>
            )}
        </div>

        <button
            type="button"
            onClick={onOpen}
            aria-haspopup="dialog"
            aria-label={`Open ${label.split(" · ")[0]!.toLowerCase()}`}
            className="absolute inset-0 cursor-pointer rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        />
    </section>
);

export default InsightCard;

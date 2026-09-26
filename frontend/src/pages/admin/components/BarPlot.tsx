import type { ReactNode } from "react";
import { cn } from "../../../lib/cn";
import { plotPeak, type PlotBar } from "../lib/plot";
import { sliderProps, usePlotCursor } from "./usePlotCursor";

interface BarPlotProps {
    bars: PlotBar[];
    /** What the plot is, for assistive tech: "People here each day". */
    label: string;
    /** The selected bar in words, for assistive tech and the readout. */
    describe: (index: number) => string;
    /** The line above the plot. Defaults to `describe`. */
    readout?: (index: number) => ReactNode;
    height?: number;
    /** A reference level drawn across the plot in ember, the one mark on it
     *  that is an answer rather than data. */
    marker?: { value: number; label: string };
    axis?: { start: string; end: string };
    className?: string;
}

/**
 * Bars drawn the way the rest of PlayRates draws them: faint for the past,
 * solid for the one being read. The latest is read until you point at, tap or
 * arrow to another, so the readout is never empty and never needs a hover.
 */
const BarPlot = ({
    bars,
    label,
    describe,
    readout = describe,
    height = 88,
    marker,
    axis,
    className,
}: BarPlotProps) => {
    const cursor = usePlotCursor<HTMLDivElement>(bars.length);
    const index = cursor.index;
    const peak = plotPeak(bars, marker?.value ?? 0);
    // Past about sixty bars a 3px gutter eats the bars themselves.
    const gap = bars.length > 60 ? 1 : bars.length > 20 ? 2 : 3;

    return (
        <div className={cn("flex min-w-0 flex-col gap-2.5", className)}>
            <div aria-hidden className="min-h-5 text-label text-content-secondary">
                {bars.length > 0 && readout(index)}
            </div>

            <div
                ref={cursor.ref}
                {...sliderProps(label, index, bars.length, bars.length > 0 ? describe(index) : "")}
                {...cursor.handlers}
                className="relative flex cursor-crosshair touch-pan-y items-end rounded-xs focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
                style={{ height, gap }}
            >
                {bars.map((bar, i) => {
                    const lit = i === index;
                    const drawn = bar.segments.filter((s) => s.value > 0);
                    return (
                        <div
                            key={bar.key}
                            className={cn(
                                "flex h-full min-w-0 flex-1 flex-col-reverse gap-px transition-opacity duration-200",
                                lit ? "opacity-100" : "opacity-40"
                            )}
                        >
                            {drawn.length === 0 ? (
                                <span className="h-0.5 w-full rounded-full bg-strong" />
                            ) : (
                                drawn.map((segment, s) => (
                                    <span
                                        key={segment.key}
                                        className={cn(
                                            "w-full shrink-0",
                                            s === drawn.length - 1 && "rounded-t-[3px]",
                                            segment.className
                                        )}
                                        style={{
                                            height: Math.max(2, (segment.value / peak) * height),
                                        }}
                                    />
                                ))
                            )}
                        </div>
                    );
                })}

                {marker && (
                    <span
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 border-t border-dashed border-accent/80"
                        style={{ bottom: (marker.value / peak) * height }}
                    >
                        <span className="absolute -top-2 right-0 flex -translate-y-full items-center gap-1 rounded-xs bg-surface-raised/90 px-1 text-stamp text-content-muted">
                            <span className="size-1.5 rounded-full bg-accent" />
                            {marker.label}
                        </span>
                    </span>
                )}
            </div>

            {axis && (
                <div
                    aria-hidden
                    className="flex justify-between border-t border-subtle pt-1.5 font-mono text-stamp text-content-muted"
                >
                    <span>{axis.start}</span>
                    <span>{axis.end}</span>
                </div>
            )}
        </div>
    );
};

export default BarPlot;

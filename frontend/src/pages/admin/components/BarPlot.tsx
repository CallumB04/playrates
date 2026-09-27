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
    /** A picture only: no readout and nothing to step through, for a plot
     *  inside something that is itself the control, such as a card. */
    still?: boolean;
    /** Said in place of the bars when every one is zero. */
    empty?: ReactNode;
    className?: string;
}

const Axis = ({ start, end }: { start: string; end: string }) => (
    <div
        aria-hidden
        className="flex justify-between border-t border-subtle pt-1.5 font-mono text-stamp text-content-muted"
    >
        <span>{start}</span>
        <span>{end}</span>
    </div>
);

/**
 * Bars counted up each day. The latest is read until you point at, tap or
 * arrow to another, so the readout is never empty and never needs a hover;
 * while one is being read the rest fall back.
 */
const BarPlot = ({
    bars,
    label,
    describe,
    readout = describe,
    height = 88,
    marker,
    axis,
    still = false,
    empty,
    className,
}: BarPlotProps) => {
    const cursor = usePlotCursor<HTMLDivElement>(bars.length);
    const index = cursor.index;
    const peak = plotPeak(bars, marker?.value ?? 0);
    // Past about sixty bars a 3px gutter eats the bars themselves.
    const gap = bars.length > 60 ? 1 : bars.length > 20 ? 2 : 3;

    // A row of flat stubs reads as a broken chart rather than as nothing.
    if (empty && !bars.some((b) => b.segments.some((s) => s.value > 0))) {
        return (
            <div className={cn("flex min-w-0 flex-col gap-2.5", className)}>
                <div
                    className="flex items-center justify-center rounded-sm border border-dashed border-subtle px-4 text-center text-label text-content-muted"
                    style={{ height: still ? height : height + 30 }}
                >
                    {empty}
                </div>
                {axis && <Axis {...axis} />}
            </div>
        );
    }

    return (
        <div className={cn("flex min-w-0 flex-col gap-2.5", className)}>
            {!still && (
                <div
                    aria-hidden
                    className="min-h-5 text-label text-content-secondary"
                >
                    {bars.length > 0 && readout(index)}
                </div>
            )}

            <div
                ref={cursor.ref}
                {...(still
                    ? { role: "img", "aria-label": label }
                    : {
                          ...sliderProps(
                              label,
                              index,
                              bars.length,
                              bars.length > 0 ? describe(index) : ""
                          ),
                          ...cursor.handlers,
                      })}
                className={cn(
                    "relative flex items-end rounded-xs",
                    !still &&
                        "cursor-crosshair touch-pan-y focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
                )}
                style={{ height, gap }}
            >
                {bars.map((bar, i) => {
                    // Bars only fade to single one out once someone is
                    // reading one; at rest they are all the answer.
                    const lit = still || !cursor.engaged || i === index;
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
                                            s === drawn.length - 1 &&
                                                "rounded-t-[3px]",
                                            segment.className
                                        )}
                                        style={{
                                            height: Math.max(
                                                2,
                                                (segment.value / peak) * height
                                            ),
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
                        <span
                            className={cn(
                                "absolute right-0 flex items-center gap-1 rounded-xs bg-surface-raised/90 px-1 text-stamp text-content-muted",
                                // Near the top the label would sit on the
                                // readout, so it hangs below the line instead.
                                marker.value / peak > 0.8
                                    ? "top-1"
                                    : "-top-2 -translate-y-full"
                            )}
                        >
                            <span className="size-1.5 rounded-full bg-accent" />
                            {marker.label}
                        </span>
                    </span>
                )}
            </div>

            {axis && <Axis {...axis} />}
        </div>
    );
};

export default BarPlot;

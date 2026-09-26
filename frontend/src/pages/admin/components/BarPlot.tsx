import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { cn } from "../../../lib/cn";
import { barIndexAt, plotPeak, type PlotBar } from "../lib/plot";

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
    const latest = Math.max(0, bars.length - 1);
    const [picked, setPicked] = useState<number | null>(null);
    const plotRef = useRef<HTMLDivElement>(null);
    const index = Math.min(picked ?? latest, latest);
    const peak = plotPeak(bars, marker?.value ?? 0);
    // Past about sixty bars a 3px gutter eats the bars themselves.
    const gap = bars.length > 60 ? 1 : bars.length > 20 ? 2 : 3;

    const pickAt = (event: PointerEvent<HTMLDivElement>) => {
        const rect = plotRef.current?.getBoundingClientRect();
        if (!rect) return;
        setPicked(barIndexAt(event.clientX - rect.left, rect.width, bars.length));
    };

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const step: Record<string, number> = {
            ArrowLeft: index - 1,
            ArrowRight: index + 1,
            Home: 0,
            End: latest,
        };
        if (!(event.key in step)) return;
        event.preventDefault();
        setPicked(Math.min(latest, Math.max(0, step[event.key]!)));
    };

    return (
        <div className={cn("flex min-w-0 flex-col gap-2.5", className)}>
            <div aria-hidden className="min-h-5 text-label text-content-secondary">
                {bars.length > 0 && readout(index)}
            </div>

            <div
                ref={plotRef}
                role="slider"
                tabIndex={0}
                aria-label={label}
                aria-valuemin={0}
                aria-valuemax={latest}
                aria-valuenow={index}
                aria-valuetext={bars.length > 0 ? describe(index) : "No data"}
                onPointerMove={pickAt}
                onPointerDown={pickAt}
                // A mouse leaving hands the plot back to the latest; a finger
                // lifting keeps what it chose, since there is no hover to fall
                // back on.
                onPointerLeave={(e) => e.pointerType === "mouse" && setPicked(null)}
                onBlur={() => setPicked(null)}
                onKeyDown={onKeyDown}
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

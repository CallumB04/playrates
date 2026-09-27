import { useId, type ReactNode } from "react";
import { cn } from "../../../lib/cn";
import { sliderProps, usePlotCursor } from "./usePlotCursor";

export interface LineSeries {
    key: string;
    label: string;
    values: number[];
    /** A colour token for the stroke, e.g. "var(--color-brand)". */
    color: string;
    /** A second line, drawn quieter so the first stays the answer. */
    quiet?: boolean;
}

interface LinePlotProps {
    series: LineSeries[];
    label: string;
    describe: (index: number) => string;
    readout?: (index: number) => ReactNode;
    height?: number;
    axis?: { start: string; end: string };
    /** A picture only: no readout and nothing to step through, for a plot
     *  inside something that is itself the control, such as a card. */
    still?: boolean;
    className?: string;
}

const W = 1000;

/**
 * A level over time: people around, accounts in total. A line, because the
 * reading is the shape between the days rather than each day on its own; bars
 * are for things that are counted up each day. Drawn in a stretched SVG with
 * the marks that must stay round, the dot and the cursor, laid over it in HTML.
 */
const LinePlot = ({
    series,
    label,
    describe,
    readout = describe,
    height = 112,
    axis,
    still = false,
    className,
}: LinePlotProps) => {
    const id = useId().replace(/:/g, "");
    const count = series[0]?.values.length ?? 0;
    const cursor = usePlotCursor<HTMLDivElement>(count);
    const index = cursor.index;
    const peak = Math.max(1, ...series.flatMap((s) => s.values));
    const x = (i: number) => (count <= 1 ? W : (i / (count - 1)) * W);
    // A hair of headroom, so the peak's stroke isn't clipped by the top edge.
    const y = (v: number) => height - 3 - (v / peak) * (height - 8);
    const at = count <= 1 ? 100 : (index / (count - 1)) * 100;

    return (
        <div className={cn("flex min-w-0 flex-col gap-2.5", className)}>
            {!still && (
                <div
                    aria-hidden
                    className="min-h-5 text-label text-content-secondary"
                >
                    {count > 0 && readout(index)}
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
                              count,
                              count > 0 ? describe(index) : ""
                          ),
                          ...cursor.handlers,
                      })}
                className={cn(
                    "relative rounded-xs",
                    !still &&
                        "cursor-crosshair touch-pan-y focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
                )}
                style={{ height }}
            >
                <svg
                    viewBox={`0 0 ${W} ${height}`}
                    preserveAspectRatio="none"
                    aria-hidden
                    className="absolute inset-0 size-full overflow-visible"
                >
                    <defs>
                        <linearGradient
                            id={`${id}-wash`}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop
                                offset="0%"
                                stopColor={series[0]?.color}
                                stopOpacity={0.18}
                            />
                            <stop
                                offset="100%"
                                stopColor={series[0]?.color}
                                stopOpacity={0}
                            />
                        </linearGradient>
                    </defs>
                    <line
                        x1={0}
                        x2={W}
                        y1={height - 0.5}
                        y2={height - 0.5}
                        stroke="var(--color-subtle)"
                        vectorEffect="non-scaling-stroke"
                    />
                    {series[0] && count > 1 && (
                        <path
                            d={`M0,${height} ${series[0].values.map((v, i) => `L${x(i)},${y(v)}`).join(" ")} L${W},${height} Z`}
                            fill={`url(#${id}-wash)`}
                        />
                    )}
                    {series.map((s) => (
                        <polyline
                            key={s.key}
                            points={s.values
                                .map((v, i) => `${x(i)},${y(v)}`)
                                .join(" ")}
                            fill="none"
                            stroke={s.color}
                            strokeWidth={s.quiet ? 1.5 : 2}
                            strokeDasharray={s.quiet ? "4 4" : undefined}
                            strokeOpacity={s.quiet ? 0.7 : 1}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            vectorEffect="non-scaling-stroke"
                        />
                    ))}
                </svg>

                {count > 0 && (
                    <>
                        {!still && (
                            <span
                                aria-hidden
                                className="pointer-events-none absolute inset-y-0 w-px bg-strong"
                                style={{ left: `${at}%` }}
                            />
                        )}
                        {series.map((s) => (
                            <span
                                key={s.key}
                                aria-hidden
                                className={cn(
                                    "pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface-raised",
                                    s.quiet && "size-2"
                                )}
                                style={{
                                    left: `${at}%`,
                                    top: y(s.values[index] ?? 0),
                                    background: s.color,
                                }}
                            />
                        ))}
                    </>
                )}
            </div>

            {(axis || series.length > 1) && (
                <div
                    aria-hidden
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 font-mono text-stamp text-content-muted"
                >
                    <span>{axis?.start}</span>
                    {series.length > 1 && (
                        <span className="flex gap-3 font-sans text-label-sm">
                            {series.map((s) => (
                                <span
                                    key={s.key}
                                    className="flex items-center gap-1.5"
                                >
                                    <span
                                        className={cn(
                                            "h-0.5 w-3 rounded-full",
                                            s.quiet && "opacity-70"
                                        )}
                                        style={{ background: s.color }}
                                    />
                                    {s.label}
                                </span>
                            ))}
                        </span>
                    )}
                    <span>{axis?.end}</span>
                </div>
            )}
        </div>
    );
};

export default LinePlot;

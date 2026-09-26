import { useId, type ReactElement, type ReactNode } from "react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import type { AdminBucket } from "@playrates/shared";
import { formatCount } from "../../../lib/format";
import { bucketLabel, compactNumber } from "../lib/adminFormat";

/** One plotted measure. `color` is a chart token, in series order. */
export interface Series<K extends string> {
    key: K;
    label: string;
    color: string;
}

type Row<K extends string> = { bucket: string } & Record<K, number>;

const AXIS_TICK = { fill: "var(--color-content-muted)", fontSize: 11 };

/** Values lead and names follow: by the time someone hovers they know the
 *  series and want the number. Keyed with a short stroke, not a box. */
const ChartTooltip = <K extends string>({
    active,
    payload,
    label,
    series,
    bucket,
}: {
    // filled in by recharts, which clones the element it is given
    active?: boolean;
    payload?: readonly { payload?: unknown }[];
    label?: string | number;
    series: Series<K>[];
    bucket: AdminBucket;
}) => {
    if (!active || !payload?.length) return null;
    const row = payload[0]!.payload as Row<K>;
    return (
        <div className="min-w-36 rounded-md border border-subtle bg-surface-overlay px-3 py-2 shadow-e2">
            <p className="mb-1.5 text-label-sm text-content-muted">
                {bucketLabel(String(label), bucket)}
            </p>
            <ul className="flex flex-col gap-1">
                {[...series].reverse().map((s) => (
                    <li key={s.key} className="flex items-center gap-2">
                        <span
                            aria-hidden
                            className="h-0.5 w-3 rounded-full"
                            style={{ background: s.color }}
                        />
                        <span className="font-mono text-body-sm font-semibold text-content tabular-nums">
                            {formatCount(row[s.key])}
                        </span>
                        <span className="text-label-sm text-content-secondary">
                            {s.label}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

/** Present for two series or more, so identity never rests on colour. */
export const Legend = <K extends string>({
    series,
    mark,
}: {
    series: Series<K>[];
    mark: "line" | "block";
}) =>
    series.length < 2 ? null : (
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {series.map((s) => (
                <li
                    key={s.key}
                    className="flex items-center gap-1.5 text-label-sm text-content-secondary"
                >
                    <span
                        aria-hidden
                        className={mark === "line" ? "h-0.5 w-3.5 rounded-full" : "size-2.5 rounded-xs"}
                        style={{ background: s.color }}
                    />
                    {s.label}
                </li>
            ))}
        </ul>
    );

/** Every value the chart shows, without needing to hover for it. */
const TableView = <K extends string>({
    data,
    series,
    bucket,
    caption,
}: {
    data: Row<K>[];
    series: Series<K>[];
    bucket: AdminBucket;
    caption: string;
}) => (
    <details className="group mt-2">
        <summary className="relative inline-flex min-h-11 cursor-pointer items-center text-label text-content-muted hover:text-content sm:min-h-0">
            View as table
        </summary>
        <div className="mt-2 max-h-72 overflow-auto rounded-md border border-subtle">
            <table className="w-full text-left text-body-sm">
                <caption className="sr-only">{caption}</caption>
                <thead className="sticky top-0 bg-surface-sunken text-label-sm text-content-muted">
                    <tr>
                        <th className="px-3 py-1.5 font-medium">
                            {bucket === "week" ? "Week" : "Day"}
                        </th>
                        {series.map((s) => (
                            <th key={s.key} className="px-3 py-1.5 text-right font-medium">
                                {s.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="font-mono tabular-nums">
                    {[...data].reverse().map((row) => (
                        <tr key={row.bucket} className="border-t border-subtle">
                            <td className="px-3 py-1 font-sans text-content-secondary">
                                {bucketLabel(row.bucket, bucket)}
                            </td>
                            {series.map((s) => (
                                <td key={s.key} className="px-3 py-1 text-right text-content">
                                    {formatCount(row[s.key])}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </details>
);

interface ChartProps<K extends string> {
    data: Row<K>[];
    series: Series<K>[];
    bucket: AdminBucket;
    /** What it shows, for the table's caption and screen readers. */
    caption: string;
    height?: number;
    /** Dimmed while a new range loads, so the frame holds still. */
    stale?: boolean;
}

const Frame = ({
    caption,
    stale,
    height,
    children,
}: {
    caption: string;
    stale?: boolean;
    height: number;
    children: ReactNode;
}) => (
    <div
        role="img"
        aria-label={caption}
        className="w-full min-w-0 transition-opacity"
        style={{ height, opacity: stale ? 0.55 : 1 }}
    >
        <ResponsiveContainer width="100%" height="100%">
            {children as ReactElement}
        </ResponsiveContainer>
    </div>
);

const xAxis = (bucket: AdminBucket) => (
    <XAxis
        dataKey="bucket"
        tickFormatter={(value: string) => bucketLabel(value, "day")}
        tick={AXIS_TICK}
        tickLine={false}
        axisLine={{ stroke: "var(--color-subtle)" }}
        minTickGap={24}
        interval="preserveStartEnd"
        aria-label={bucket === "week" ? "Week" : "Day"}
    />
);

const yAxis = (
    <YAxis
        tick={AXIS_TICK}
        tickLine={false}
        axisLine={false}
        tickFormatter={compactNumber}
        allowDecimals={false}
        width={36}
    />
);

const grid = <CartesianGrid vertical={false} stroke="var(--color-subtle)" />;

/** Lines over a soft wash, for measures that are levels rather than tallies. */
export const TrendChart = <K extends string>({
    data,
    series,
    bucket,
    caption,
    height = 240,
    stale,
}: ChartProps<K>) => {
    const id = useId().replace(/:/g, "");
    return (
        <div className="flex flex-col gap-3">
            <Legend series={series} mark="line" />
            <Frame caption={caption} stale={stale} height={height}>
                <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <defs>
                        {series.map((s) => (
                            <linearGradient key={s.key} id={`${id}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={s.color} stopOpacity={0.16} />
                                <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
                            </linearGradient>
                        ))}
                    </defs>
                    {grid}
                    {xAxis(bucket)}
                    {yAxis}
                    <Tooltip
                        cursor={{ stroke: "var(--color-strong)", strokeWidth: 1 }}
                        content={<ChartTooltip series={series} bucket={bucket} />}
                    />
                    {series.map((s) => (
                        <Area
                            key={s.key}
                            type="monotone"
                            dataKey={s.key}
                            name={s.label}
                            stroke={s.color}
                            strokeWidth={2}
                            fill={`url(#${id}-${s.key})`}
                            activeDot={{
                                r: 4,
                                fill: s.color,
                                stroke: "var(--color-surface-raised)",
                                strokeWidth: 2,
                            }}
                            dot={false}
                            isAnimationActive={false}
                        />
                    ))}
                </AreaChart>
            </Frame>
            <TableView data={data} series={series} bucket={bucket} caption={caption} />
        </div>
    );
};

/** Tallies per bucket, stacked, so the total and its make-up read at once. */
export const StackedColumns = <K extends string>({
    data,
    series,
    bucket,
    caption,
    height = 240,
    stale,
}: ChartProps<K>) => (
    <div className="flex flex-col gap-3">
        <Legend series={series} mark="block" />
        <Frame caption={caption} stale={stale} height={height}>
            <BarChart
                data={data}
                margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                barCategoryGap="18%"
            >
                {grid}
                {xAxis(bucket)}
                {yAxis}
                <Tooltip
                    cursor={{ fill: "var(--color-surface-hover)" }}
                    content={<ChartTooltip series={series} bucket={bucket} />}
                />
                {series.map((s, index) => (
                    <Bar
                        key={s.key}
                        dataKey={s.key}
                        name={s.label}
                        stackId="made"
                        fill={s.color}
                        maxBarSize={24}
                        // the surface-coloured edge is the gap between segments
                        stroke="var(--color-surface-raised)"
                        strokeWidth={2}
                        radius={index === series.length - 1 ? [4, 4, 0, 0] : 0}
                        isAnimationActive={false}
                    />
                ))}
            </BarChart>
        </Frame>
        <TableView data={data} series={series} bucket={bucket} caption={caption} />
    </div>
);

/** A tile's trend: no axes, the shape only, the latest point marked. */
export const Sparkline = ({
    values,
    label,
    className,
}: {
    values: number[];
    label: string;
    className?: string;
}) => {
    const width = 120;
    const height = 32;
    if (values.length < 2) return null;
    const max = Math.max(1, ...values);
    const step = width / (values.length - 1);
    const y = (v: number) => height - 3 - (v / max) * (height - 6);
    const points = values.map((v, i) => `${(i * step).toFixed(1)},${y(v).toFixed(1)}`);
    const last = values.at(-1)!;
    return (
        <svg
            viewBox={`-3 0 ${width + 6} ${height}`}
            width={width}
            height={height}
            role="img"
            aria-label={label}
            className={className}
        >
            <polyline
                points={points.join(" ")}
                fill="none"
                stroke="var(--color-content-muted)"
                strokeOpacity={0.6}
                strokeWidth={1.5}
                strokeLinejoin="round"
                strokeLinecap="round"
            />
            <circle
                cx={width}
                cy={y(last)}
                r={3}
                fill="var(--color-brand)"
                stroke="var(--color-surface-raised)"
                strokeWidth={1.5}
            />
        </svg>
    );
};

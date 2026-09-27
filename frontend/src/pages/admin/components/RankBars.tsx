import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "../../../lib/cn";
import { formatCount } from "../../../lib/format";

export interface Ranked {
    key: string;
    label: string;
    /** A face or a cover beside the name. */
    lead?: ReactNode;
    value: number;
    href?: string;
}

/**
 * A ranking as bars laid along each name: the lengths say at a glance how
 * far ahead the leader is, which a column of figures doesn't. Measured
 * against the leader, so the first bar is always full.
 */
const RankBars = ({
    items,
    unit,
    fills = ["bg-brand", "bg-brand/55"],
    className,
}: {
    items: Ranked[];
    unit: [string, string];
    /** The leader's bar, then the rest: the colour of the chart it expands. */
    fills?: [string, string];
    className?: string;
}) => {
    const peak = Math.max(1, ...items.map((i) => i.value));
    return (
        <ol className={cn("flex flex-col", className)}>
            {items.map((item, i) => {
                // Level with the leader is leading too.
                const leads = item.value === peak;
                const body = (
                    <>
                        <span
                            className={cn(
                                "w-5 shrink-0 font-mono text-label-sm",
                                leads
                                    ? "font-semibold text-brand"
                                    : "text-content-muted"
                            )}
                        >
                            #{i + 1}
                        </span>
                        {item.lead}
                        <span className="min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-3">
                                <span className="truncate text-body-sm font-medium text-content">
                                    {item.label}
                                </span>
                                <span className="shrink-0 text-label-sm text-content-muted">
                                    <span className="font-mono text-content">
                                        {formatCount(item.value)}
                                    </span>{" "}
                                    {item.value === 1 ? unit[0] : unit[1]}
                                </span>
                            </span>
                            <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                                <span
                                    className={cn(
                                        "block h-full rounded-full",
                                        leads ? fills[0] : fills[1]
                                    )}
                                    style={{
                                        width: `${(item.value / peak) * 100}%`,
                                    }}
                                />
                            </span>
                        </span>
                    </>
                );
                return (
                    <li key={item.key}>
                        {item.href ? (
                            <Link
                                to={item.href}
                                className="flex min-h-11 items-center gap-3 rounded-sm px-1 py-2 lift hover:bg-surface-hover"
                            >
                                {body}
                            </Link>
                        ) : (
                            <span className="flex items-center gap-3 px-1 py-2">
                                {body}
                            </span>
                        )}
                    </li>
                );
            })}
        </ol>
    );
};

export default RankBars;

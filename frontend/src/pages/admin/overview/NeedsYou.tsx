import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cardClass } from "../../../components/ui/cardClass";
import { Skeleton } from "../../../components/ui/Skeleton";
import { tagClass } from "../../../components/ui/tagClass";
import { cn } from "../../../lib/cn";
import { formatCount } from "../../../lib/format";
import {
    useAdminAttention,
    useAdminHealth,
} from "../../../hooks/queries/useAdmin";
import SectionHeader from "../components/SectionHeader";
import { STATE } from "../health/healthState";
import { needsYou, type NeedsYouItem } from "../lib/attention";

const ROW = cn(
    "flex min-h-14 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left lift hover:bg-surface-hover sm:px-5",
    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
);

const Dot = ({ className }: { className: string }) => (
    <span className="flex w-9 shrink-0 justify-center">
        <span aria-hidden className={cn("size-2.5 rounded-full", className)} />
    </span>
);

const Body = ({ item }: { item: NeedsYouItem }) => (
    <>
        {item.count === undefined ? (
            <Dot className={STATE[item.state ?? "slow"].dot} />
        ) : (
            <span
                className={tagClass(
                    item.key === "health" ? "live" : "brand",
                    "min-w-9 justify-center font-mono text-label tabular-nums"
                )}
            >
                {formatCount(item.count)}
            </span>
        )}
        <span className="min-w-0 flex-1">
            <span className="block text-body-sm font-medium text-content">
                {item.text}
            </span>
            {item.detail && (
                <span className="block text-label-sm text-content-muted">
                    {item.detail}
                </span>
            )}
        </span>
        <ChevronRight
            size={16}
            aria-hidden
            className="shrink-0 text-content-muted"
        />
    </>
);

/**
 * The first thing the overview answers: is anything wrong, and what is
 * waiting. Each row goes to where it's dealt with; a system's state, or
 * the all-clear, opens the health check.
 */
const NeedsYou = ({ onHealth }: { onHealth: () => void }) => {
    const attention = useAdminAttention();
    const health = useAdminHealth();
    const items = needsYou(attention.data, health.data);
    const loading = attention.isPending || health.isPending;
    const unknown =
        !loading && items.length === 0 && (attention.isError || health.isError);

    return (
        <section aria-labelledby="needs-you">
            <SectionHeader id="needs-you" title="Needs you" />
            {loading && items.length === 0 ? (
                <Skeleton className="h-14 rounded-lg" />
            ) : (
                <ul
                    className={cardClass(
                        "divide-y divide-subtle overflow-hidden",
                        { padding: "none" }
                    )}
                >
                    {items.length === 0 ? (
                        <li>
                            <button
                                type="button"
                                onClick={onHealth}
                                aria-haspopup="dialog"
                                className={ROW}
                            >
                                <Dot
                                    className={
                                        unknown ? "bg-danger" : "bg-success"
                                    }
                                />
                                <span className="min-w-0 flex-1 text-body-sm text-content-secondary">
                                    {unknown
                                        ? "The API isn’t answering, so this can’t say."
                                        : "Nothing needs you. Everything is answering."}
                                </span>
                                <ChevronRight
                                    size={16}
                                    aria-hidden
                                    className="shrink-0 text-content-muted"
                                />
                            </button>
                        </li>
                    ) : (
                        items.map((item) => (
                            <li key={item.key}>
                                {item.to ? (
                                    <Link to={item.to} className={ROW}>
                                        <Body item={item} />
                                    </Link>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={onHealth}
                                        aria-haspopup="dialog"
                                        className={ROW}
                                    >
                                        <Body item={item} />
                                    </button>
                                )}
                            </li>
                        ))
                    )}
                </ul>
            )}
        </section>
    );
};

export default NeedsYou;

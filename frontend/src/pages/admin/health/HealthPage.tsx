import { useState, type ReactNode } from "react";
import {
    CircleCheck,
    CircleX,
    Database,
    Gamepad2,
    RefreshCw,
    Server,
    TriangleAlert,
    ChevronDown,
    type LucideIcon,
} from "lucide-react";
import type { ServerErrorEntry } from "@playrates/shared";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import Panel from "../../../components/ui/Panel";
import EmptyPlate from "../../../components/ui/EmptyPlate";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import { cn } from "../../../lib/cn";
import { formatCount, relativeTime } from "../../../lib/format";
import { useAdminHealth, useServerErrors } from "../../../hooks/queries/useAdmin";
import AdminPageHeader from "../components/AdminPageHeader";
import LoadMore from "../components/LoadMore";

type State = "up" | "degraded" | "down";

const STATE: Record<State, { label: string; icon: LucideIcon; tone: string }> = {
    up: { label: "Up", icon: CircleCheck, tone: "text-success" },
    degraded: { label: "Degraded", icon: TriangleAlert, tone: "text-warning" },
    down: { label: "Down", icon: CircleX, tone: "text-danger" },
};

const duration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86_400)}d`;
};

/** A status reads by icon and word as well as colour. */
const StatusCard = ({
    title,
    icon: Icon,
    state,
    children,
}: {
    title: string;
    icon: LucideIcon;
    state: State;
    children: ReactNode;
}) => {
    const { label, icon: StateIcon, tone } = STATE[state];
    return (
        <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-label text-content-secondary">
                    <Icon size={15} aria-hidden className="text-content-muted" />
                    {title}
                </span>
                <span className={cn("flex items-center gap-1.5 text-body-sm font-medium", tone)}>
                    <StateIcon size={16} aria-hidden />
                    {label}
                </span>
            </div>
            <div className="text-body-sm text-content-secondary">{children}</div>
        </Card>
    );
};

const ErrorRow = ({ entry }: { entry: ServerErrorEntry }) => {
    const [open, setOpen] = useState(false);
    return (
        <li className="relative overflow-hidden rounded-md border border-subtle bg-surface-raised">
            <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-danger" />
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="flex w-full cursor-pointer items-center gap-3 py-2.5 pr-3 pl-4 text-left hover:bg-surface-hover"
            >
                <span className="shrink-0 rounded-sm bg-danger-subtle px-1.5 font-mono text-label-sm text-danger-content">
                    {entry.status}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-label text-content">
                        {entry.method} {entry.path}
                    </span>
                    <span className="block truncate text-label-sm text-content-muted">
                        {entry.message}
                    </span>
                </span>
                <time dateTime={entry.createdAt} className="shrink-0 text-label-sm text-content-muted">
                    {relativeTime(entry.createdAt)}
                </time>
                <ChevronDown size={16} aria-hidden className={cn("shrink-0 text-content-muted transition-transform", open && "rotate-180")} />
            </button>
            {open && (
                <div className="flex flex-col gap-2 border-t border-subtle bg-surface-sunken/40 py-3 pr-3 pl-4 text-body-sm">
                    <p className="break-words text-content">{entry.message}</p>
                    <p className="text-label-sm text-content-muted">
                        {new Date(entry.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "medium" })}
                        {entry.requestId && ` · request ${entry.requestId}`}
                        {entry.username && ` · signed in as ${entry.username}`}
                    </p>
                    {entry.stack && (
                        <pre className="max-h-64 overflow-auto rounded-sm bg-surface-sunken p-2 font-mono text-label-sm text-content-secondary">
                            {entry.stack}
                        </pre>
                    )}
                </div>
            )}
        </li>
    );
};

/**
 * Checked live when opened and every minute after. No history: that needs a
 * monitor outside the site, since a check the site runs on itself stops when
 * the site does.
 */
const HealthPage = () => {
    const health = useAdminHealth();
    const errors = useServerErrors();
    const entries = errors.data?.pages.flatMap((p) => p.data) ?? [];
    const h = health.data;

    const rawgState: State = !h
        ? "down"
        : !h.rawg.configured
          ? "down"
          : h.rawg.lastFailureAt &&
              (!h.rawg.lastRequestAt || h.rawg.lastFailureAt >= h.rawg.lastRequestAt)
            ? "degraded"
            : "up";

    return (
        <>
            <AdminPageHeader
                title="Health"
                description="Is everything answering, right now."
                actions={
                    <Button
                        variant="secondary"
                        onClick={() => health.refetch()}
                        disabled={health.isFetching}
                        className="w-full sm:w-auto"
                    >
                        <RefreshCw size={15} aria-hidden className={health.isFetching ? "animate-spin" : undefined} />
                        Check again
                    </Button>
                }
            />

            {health.isPending ? (
                <TextSkeleton lines={4} />
            ) : health.isError || !h ? (
                <StatusCard title="API" icon={Server} state="down">
                    The API didn’t answer. If the rest of the site is down too, it’s the host.
                </StatusCard>
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <StatusCard title="API" icon={Server} state="up">
                        This instance has been up {duration(h.api.uptimeSeconds)}
                        {h.api.region && ` in ${h.api.region}`}.
                        <br />
                        {h.api.commit ? `Deploy ${h.api.commit}` : "Local build"} · Node {h.api.node}
                    </StatusCard>
                    <StatusCard title="Database" icon={Database} state={h.database.ok ? "up" : "down"}>
                        {h.database.ok
                            ? `Answered in ${h.database.latencyMs}ms.`
                            : `Unreachable: ${h.database.error}`}
                    </StatusCard>
                    <StatusCard title="RAWG" icon={Gamepad2} state={rawgState}>
                        {!h.rawg.configured
                            ? "No API key set; search uses the local catalogue only."
                            : `${formatCount(h.rawg.todayRequests)} ${h.rawg.todayRequests === 1 ? "call" : "calls"} today${h.rawg.todayFailures ? `, ${h.rawg.todayFailures} failed` : ""}. Last ${relativeTime(h.rawg.lastRequestAt)}.`}
                        {h.rawg.lastError && rawgState === "degraded" && (
                            <>
                                <br />
                                Last failure {relativeTime(h.rawg.lastFailureAt)}: {h.rawg.lastError}
                            </>
                        )}
                    </StatusCard>
                    <StatusCard
                        title="Server errors"
                        icon={TriangleAlert}
                        state={h.errors.last24h === 0 ? "up" : h.errors.last24h < 10 ? "degraded" : "down"}
                    >
                        {formatCount(h.errors.last24h)} in the last day.
                        {h.errors.lastAt && ` Last ${relativeTime(h.errors.lastAt)}.`}
                    </StatusCard>
                </div>
            )}

            <Panel title="Server errors" className="mt-6">
                {errors.isPending ? (
                    <TextSkeleton lines={4} />
                ) : entries.length === 0 ? (
                    <EmptyPlate title="No errors" body="Every 5xx the API returns lands here." />
                ) : (
                    <>
                        <ul className="flex flex-col gap-1.5">
                            {entries.map((entry) => (
                                <ErrorRow key={entry.id} entry={entry} />
                            ))}
                        </ul>
                        <LoadMore
                            hasMore={errors.hasNextPage}
                            loading={errors.isFetchingNextPage}
                            onClick={() => errors.fetchNextPage()}
                        />
                    </>
                )}
            </Panel>
        </>
    );
};

export default HealthPage;

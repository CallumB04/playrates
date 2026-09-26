import { useState, type ReactNode } from "react";
import type { AdminHealth, ServerErrorEntry } from "@playrates/shared";
import Button from "../../../components/ui/Button";
import { cardClass } from "../../../components/ui/Card";
import { plateClass } from "../../../components/ui/Plate";
import EmptyPlate, { EmptyNote } from "../../../components/ui/EmptyPlate";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import { cn } from "../../../lib/cn";
import { formatCount, relativeTime } from "../../../lib/format";
import { useAdminHealth, useServerErrors } from "../../../hooks/queries/useAdmin";
import AdminPageHeader from "../components/AdminPageHeader";
import SectionHeader from "../components/SectionHeader";
import ShowOlder from "../components/ShowOlder";
import { SeeAllButton, SeeAllModal } from "../components/SeeAll";
import { useSeeAll } from "../components/useSeeAll";
import { headline, systemStates, type SystemState } from "./healthState";

const STATE: Record<SystemState, { word: string; dot: string; text: string }> = {
    up: { word: "Answering", dot: "bg-success", text: "text-success" },
    slow: { word: "Struggling", dot: "bg-warning", text: "text-warning" },
    down: { word: "Down", dot: "bg-danger", text: "text-danger" },
};

/** How long, as a figure and its unit, so only the figure is set in mono. */
const duration = (seconds: number): [number, string] => {
    const [n, unit] =
        seconds < 60 ? [seconds, "second"]
        : seconds < 3600 ? [Math.floor(seconds / 60), "minute"]
        : seconds < 86_400 ? [Math.floor(seconds / 3600), "hour"]
        : [Math.floor(seconds / 86_400), "day"];
    return [n, n === 1 ? unit : `${unit}s`];
};

/** A system's name and state read as words; the dot only repeats them. */
const System = ({ name, state, children }: { name: string; state: SystemState; children: ReactNode }) => (
    <div className="flex flex-col gap-1 border-b border-subtle py-3.5 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-6">
        <span className="flex w-52 shrink-0 items-center gap-2.5">
            <span aria-hidden className={cn("size-2 shrink-0 rounded-full", STATE[state].dot)} />
            <span className="text-body-sm font-medium text-content">{name}</span>
            <span className={cn("text-label", STATE[state].text)}>{STATE[state].word}</span>
        </span>
        <span className="pl-4.5 text-body-sm text-content-secondary sm:pl-0">{children}</span>
    </div>
);

const ErrorRow = ({ entry }: { entry: ServerErrorEntry }) => {
    const [open, setOpen] = useState(false);
    return (
        <li>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className={cn(
                    "flex w-full cursor-pointer items-start gap-3 rounded-md px-2 py-2.5 text-left lift hover:bg-surface-hover",
                    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                    open && "bg-surface-hover"
                )}
            >
                <span className="w-9 shrink-0 pt-px font-mono text-body-sm font-semibold text-danger">{entry.status}</span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-label text-content">
                        {entry.method} {entry.path}
                    </span>
                    <span className="mt-1 block text-label-sm break-words text-content-muted">
                        {entry.message} · {relativeTime(entry.createdAt)}
                    </span>
                </span>
            </button>
            {open && (
                <div className="pb-2 pl-2 sm:pl-14">
                    <div className={plateClass("pressed", "shallow", "flex flex-col gap-2 px-3.5 py-3 text-body-sm")}>
                        <p className="text-label text-content-muted">
                            {new Date(entry.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "medium" })}
                            {entry.requestId && <> · request <span className="font-mono">{entry.requestId}</span></>}
                            {entry.username && <> · signed in as {entry.username}</>}
                        </p>
                        {entry.stack ? (
                            <pre className="max-h-72 overflow-auto font-mono text-label-sm leading-relaxed whitespace-pre text-content-secondary">
                                {entry.stack}
                            </pre>
                        ) : (
                            <p className="text-content-muted">No stack came with it.</p>
                        )}
                    </div>
                </div>
            )}
        </li>
    );
};

const ErrorList = ({ entries }: { entries: ServerErrorEntry[] }) => (
    <ul className={cardClass("flex flex-col px-1.5 py-1.5 sm:px-2", { padding: "none" })}>
        {entries.map((entry) => (
            <ErrorRow key={entry.id} entry={entry} />
        ))}
    </ul>
);

const AllErrors = () => {
    const errors = useServerErrors();
    const entries = errors.data?.pages.flatMap((p) => p.data) ?? [];
    return (
        <>
            <ErrorList entries={entries} />
            <ShowOlder
                hasMore={errors.hasNextPage}
                loading={errors.isFetchingNextPage}
                onClick={() => errors.fetchNextPage()}
                end="That’s every error there has been."
            />
        </>
    );
};

/** The last three failed requests; the rest behind a popup. */
const Errors = () => {
    const errors = useServerErrors();
    const entries = (errors.data?.pages[0]?.data ?? []).slice(0, 3);
    const all = useSeeAll();
    return (
        <section>
            <SectionHeader title="Failed requests" trailing={entries.length > 0 && <SeeAllButton onClick={all.show} />} />
            {errors.isPending ? (
                <TextSkeleton lines={3} />
            ) : entries.length === 0 ? (
                <EmptyNote>None. Every request the API fails is kept here, with its stack.</EmptyNote>
            ) : (
                <ErrorList entries={entries} />
            )}
            {all.open && (
                <SeeAllModal title="Failed requests" onClose={all.hide} wide>
                    <AllErrors />
                </SeeAllModal>
            )}
        </section>
    );
};

const GLOW: Record<SystemState, string> = {
    up: "bg-success/10",
    slow: "bg-warning/12",
    down: "bg-danger/14",
};

/**
 * Checked live when opened, and every minute after. There's no history of it:
 * a site checking itself stops when the site does, so that needs a monitor
 * somewhere else.
 */
const HealthPage = () => {
    const health = useAdminHealth();
    const h = health.data;

    const body = (health: AdminHealth, checkedAt: number) => {
        const states = systemStates(health);
        const lead = headline(states, health.errors.last24h);
        return (
            <section aria-label="Right now" className={cardClass("relative overflow-hidden", { padding: "none" })}>
                <span
                    aria-hidden
                    className={cn("pointer-events-none absolute -top-32 -right-28 size-80 rounded-full blur-3xl", GLOW[lead.state])}
                />
                <div className="relative px-5 pt-6 sm:px-6 sm:pt-7 lg:px-8">
                    <h2 className="text-label text-content-muted">Right now</h2>
                    <p className="mt-3 max-w-[24ch] font-display text-title text-content">{lead.text}</p>
                    <p className="mt-3 text-label text-content-muted">
                        Checked {relativeTime(new Date(checkedAt).toISOString())}
                    </p>
                </div>
                <div className="relative mt-5 border-t border-subtle px-5 sm:px-6 lg:px-8">
                    <System name="API" state={states.api}>
                        Up <span className="font-mono">{duration(health.api.uptimeSeconds)[0]}</span>{" "}
                        {duration(health.api.uptimeSeconds)[1]}
                        {health.api.region && <> in {health.api.region}</>} ·{" "}
                        {health.api.commit ? (
                            <>
                                deploy <span className="font-mono">{health.api.commit}</span>
                            </>
                        ) : (
                            "a local build"
                        )}{" "}
                        · Node <span className="font-mono">{health.api.node.replace(/^v/, "")}</span>
                    </System>
                    <System name="Database" state={states.database}>
                        {health.database.ok ? (
                            <>
                                Answered in <span className="font-mono">{health.database.latencyMs}ms</span>
                            </>
                        ) : (
                            health.database.error
                        )}
                    </System>
                    <System name="RAWG" state={states.rawg}>
                        {!health.rawg.configured ? (
                            "No API key is set, so search uses the local catalogue only."
                        ) : (
                            <>
                                <span className="font-mono">{formatCount(health.rawg.todayRequests)}</span>{" "}
                                {health.rawg.todayRequests === 1 ? "call" : "calls"} today
                                {health.rawg.todayFailures > 0 && (
                                    <>
                                        , <span className="font-mono">{health.rawg.todayFailures}</span> failed
                                    </>
                                )}
                                {health.rawg.lastRequestAt && <> · last call {relativeTime(health.rawg.lastRequestAt)}</>}
                                {states.rawg === "slow" && health.rawg.lastError && <> · {health.rawg.lastError}</>}
                            </>
                        )}
                    </System>
                    <System name="Failed requests" state={states.errors}>
                        <span className="font-mono">{formatCount(health.errors.last24h)}</span>{" "}
                        in the last day
                        {health.errors.lastAt && <> · most recent {relativeTime(health.errors.lastAt)}</>}
                    </System>
                </div>
            </section>
        );
    };

    return (
        <>
            <AdminPageHeader
                title="Health"
                actions={
                    <Button
                        variant="secondary"
                        onClick={() => health.refetch()}
                        disabled={health.isFetching}
                        className="w-full sm:w-auto"
                    >
                        {health.isFetching ? "Checking…" : "Check again"}
                    </Button>
                }
            />

            <div className="flex flex-col gap-10">
                {health.isPending ? (
                    <div className={cardClass()}>
                        <TextSkeleton lines={5} />
                    </div>
                ) : health.isError || !h ? (
                    <EmptyPlate
                        title="The API isn’t answering"
                        body="If the rest of the site is down too, it’s the host. This page can’t say more without the API."
                    />
                ) : (
                    body(h, health.dataUpdatedAt)
                )}

                <Errors />
            </div>
        </>
    );
};

export default HealthPage;

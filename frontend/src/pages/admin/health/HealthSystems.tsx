import type { ReactNode } from "react";
import type { AdminHealth } from "@playrates/shared";
import { cn } from "../../../lib/cn";
import { formatCount, relativeTime } from "../../../lib/format";
import { STATE, systemStates, type SystemState } from "./healthState";

/** How long, as a figure and its unit, so only the figure is set in mono. */
const duration = (seconds: number): [number, string] => {
    const [n, unit] =
        seconds < 60
            ? [seconds, "second"]
            : seconds < 3600
              ? [Math.floor(seconds / 60), "minute"]
              : seconds < 86_400
                ? [Math.floor(seconds / 3600), "hour"]
                : [Math.floor(seconds / 86_400), "day"];
    return [n, n === 1 ? unit : `${unit}s`];
};

/** A system's name and state read as words; the dot only repeats them. */
const System = ({
    name,
    state,
    children,
}: {
    name: string;
    state: SystemState;
    children: ReactNode;
}) => (
    <div className="flex flex-col gap-1 border-b border-subtle py-3.5 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-6">
        <span className="flex w-52 shrink-0 items-center gap-2.5">
            <span
                aria-hidden
                className={cn("size-2 shrink-0 rounded-full", STATE[state].dot)}
            />
            <span className="text-body-sm font-medium text-content">
                {name}
            </span>
            <span className={cn("text-label", STATE[state].text)}>
                {STATE[state].word}
            </span>
        </span>
        <span className="pl-4.5 text-body-sm text-content-secondary sm:pl-0">
            {children}
        </span>
    </div>
);

/** Each part of PlayRates, whether it is answering, and the figure that says
 *  so. */
const HealthSystems = ({ health }: { health: AdminHealth }) => {
    const states = systemStates(health);
    return (
        <>
            <System name="API" state={states.api}>
                Up{" "}
                <span className="font-mono">
                    {duration(health.api.uptimeSeconds)[0]}
                </span>{" "}
                {duration(health.api.uptimeSeconds)[1]}
                {health.api.region && <> in {health.api.region}</>} ·{" "}
                {health.api.commit ? (
                    <>
                        deploy{" "}
                        <span className="font-mono">{health.api.commit}</span>
                    </>
                ) : (
                    "a local build"
                )}{" "}
                · Node{" "}
                <span className="font-mono">
                    {health.api.node.replace(/^v/, "")}
                </span>
            </System>
            <System name="Database" state={states.database}>
                {health.database.ok ? (
                    <>
                        Answered in{" "}
                        <span className="font-mono">
                            {health.database.latencyMs}ms
                        </span>
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
                        <span className="font-mono">
                            {formatCount(health.rawg.todayRequests)}
                        </span>{" "}
                        {health.rawg.todayRequests === 1 ? "call" : "calls"}{" "}
                        today
                        {health.rawg.todayFailures > 0 && (
                            <>
                                ,{" "}
                                <span className="font-mono">
                                    {health.rawg.todayFailures}
                                </span>{" "}
                                failed
                            </>
                        )}
                        {health.rawg.lastRequestAt && (
                            <>
                                {" "}
                                · last call{" "}
                                {relativeTime(health.rawg.lastRequestAt)}
                            </>
                        )}
                        {states.rawg === "slow" && health.rawg.lastError && (
                            <> · {health.rawg.lastError}</>
                        )}
                    </>
                )}
            </System>
            <System name="Failed requests" state={states.errors}>
                <span className="font-mono">
                    {formatCount(health.errors.last24h)}
                </span>{" "}
                in the last day
                {health.errors.lastAt && (
                    <> · most recent {relativeTime(health.errors.lastAt)}</>
                )}
            </System>
        </>
    );
};

export default HealthSystems;

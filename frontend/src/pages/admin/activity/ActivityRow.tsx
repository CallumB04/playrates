import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import type { AdminActivityEvent } from "@playrates/shared";
import GameCover from "../../../components/game/GameCover";
import { cn } from "../../../lib/cn";
import { relativeTime } from "../../../lib/format";
import {
    activityIcon,
    activitySummary,
    activityTone,
} from "./activityPresentation";

const when = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
    });

const LINK =
    "inline-flex min-h-11 items-center text-body-sm text-brand underline-offset-2 hover:underline sm:min-h-0";

/**
 * One event: what happened in a line, and everything behind it a tap away.
 * The whole summary is the toggle, so there is nothing to find by hovering.
 */
const ActivityRow = ({
    event,
    onFilterUser,
}: {
    event: AdminActivityEvent;
    /** Narrows the feed to this person, where the feed allows it. */
    onFilterUser?: (userId: string) => void;
}) => {
    const [open, setOpen] = useState(false);
    const detailsId = useId();
    const summary = activitySummary(event);
    const tone = activityTone(event);
    const Icon = activityIcon(event.kind);
    const change =
        event.kind === "log_updated"
            ? (event.data as { from?: unknown; to?: unknown })
            : null;

    return (
        <li className="relative overflow-hidden rounded-md border border-subtle bg-surface-raised">
            <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", tone.bar)} />

            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls={detailsId}
                className="flex w-full cursor-pointer items-center gap-3 py-2.5 pr-3 pl-4 text-left hover:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
            >
                <span
                    className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-sunken",
                        tone.icon
                    )}
                >
                    <Icon size={15} aria-hidden />
                </span>

                <span className="min-w-0 flex-1">
                    <span className="block text-body-sm break-words text-content-secondary">
                        <span className="font-medium text-content">{summary.who}</span>{" "}
                        {summary.action}
                        {summary.target && (
                            <>
                                {" "}
                                <span className="font-medium text-content">
                                    {summary.target}
                                </span>
                            </>
                        )}
                        {summary.tags.map((tag) => (
                            <span
                                key={tag}
                                className="ml-1.5 inline-block rounded-sm bg-surface-sunken px-1.5 align-[1px] font-mono text-label-sm text-content-muted"
                            >
                                {tag}
                            </span>
                        ))}
                    </span>
                    <time
                        dateTime={event.createdAt}
                        className="mt-0.5 block text-label-sm text-content-muted sm:hidden"
                    >
                        {relativeTime(event.createdAt)}
                    </time>
                </span>

                {event.game && (
                    <GameCover
                        coverUrl={event.game.coverUrl}
                        title={event.game.title}
                        className="hidden w-7 shrink-0 rounded-xs sm:block"
                    />
                )}
                <time
                    dateTime={event.createdAt}
                    className="hidden w-20 shrink-0 text-right text-label-sm text-content-muted sm:block"
                >
                    {relativeTime(event.createdAt)}
                </time>
                <ChevronDown
                    size={16}
                    aria-hidden
                    className={cn(
                        "shrink-0 text-content-muted transition-transform",
                        open && "rotate-180"
                    )}
                />
            </button>

            {open && (
                <div
                    id={detailsId}
                    className="flex flex-col gap-3 border-t border-subtle bg-surface-sunken/40 py-3 pr-3 pl-4 sm:pl-15"
                >
                    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-body-sm">
                        <dt className="text-content-muted">When</dt>
                        <dd className="text-content">{when(event.createdAt)}</dd>
                        <dt className="text-content-muted">Event</dt>
                        <dd className="font-mono text-label text-content">{event.kind}</dd>
                        {change && (
                            <>
                                <dt className="text-content-muted">Change</dt>
                                <dd className="font-mono text-label break-all text-content">
                                    {JSON.stringify(change.from)} → {JSON.stringify(change.to)}
                                </dd>
                            </>
                        )}
                        {event.data.backfilled === true && (
                            <>
                                <dt className="text-content-muted">Note</dt>
                                <dd className="text-content-secondary">
                                    Recovered from what already existed when the
                                    log began, so it shows the row as it is now.
                                </dd>
                            </>
                        )}
                    </dl>

                    {event.excerpt && (
                        <blockquote className="border-l-2 border-subtle pl-3 text-body-sm break-words text-content-secondary">
                            {event.excerpt}
                        </blockquote>
                    )}

                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {summary.href && (
                            <Link to={summary.href} className={LINK}>
                                Open {summary.target}
                            </Link>
                        )}
                        {event.actor && (
                            <Link to={`/user/${event.actor.username}`} className={LINK}>
                                {event.actor.username}’s profile
                            </Link>
                        )}
                        {event.actor && onFilterUser && (
                            <button
                                type="button"
                                onClick={() => onFilterUser(event.actor!.id)}
                                className={cn(LINK, "cursor-pointer")}
                            >
                                Only {event.actor.username}’s activity
                            </button>
                        )}
                    </div>
                </div>
            )}
        </li>
    );
};

export default ActivityRow;

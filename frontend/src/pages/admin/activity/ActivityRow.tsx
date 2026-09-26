import { useId, useState } from "react";
import { Link } from "react-router-dom";
import type { AdminActivityEvent } from "@playrates/shared";
import GameCover from "../../../components/game/GameCover";
import ProfilePicture from "../../../components/ProfilePicture";
import RatingBadge from "../../../components/ui/RatingBadge";
import LedgerRow, { LedgerList } from "../../../components/ui/LedgerRow";
import { plateClass } from "../../../components/ui/Plate";
import { cn } from "../../../lib/cn";
import { relativeTime } from "../../../lib/format";
import { timeInDay } from "../lib/plot";
import { activityMark, activitySummary } from "./activityPresentation";

const at = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

const LINK =
    "inline-flex min-h-11 items-center text-label font-medium text-brand underline-offset-2 hover:underline sm:min-h-0";

/** The row's figure, when there is one worth showing. */
const Face = ({ event }: { event: AdminActivityEvent }) =>
    event.actor ? (
        <span className="shrink-0 [&>*]:size-9">
            <ProfilePicture
                variant="nav"
                file={event.actor.avatarUrl ?? ""}
                accent={event.actor.accent}
                username={event.actor.username}
                link={false}
            />
        </span>
    ) : (
        // The account is gone; its place stays so the column still lines up.
        <span aria-hidden className="size-9 shrink-0 rounded-full border border-dashed border-strong" />
    );

/**
 * One thing someone did, as a sentence, the way the home feed says it. The
 * detail opens in a well beneath it; the whole sentence is the control, so
 * there is nothing to find by hovering.
 */
const ActivityRow = ({
    event,
    day,
    onFilterUser,
}: {
    event: AdminActivityEvent;
    /** The heading of the day it sits under, so its time doesn't repeat it. */
    day: string;
    /** Narrows the feed to this person, where the feed allows it. */
    onFilterUser?: (userId: string) => void;
}) => {
    const [open, setOpen] = useState(false);
    const detailsId = useId();
    const summary = activitySummary(event);
    const mark = activityMark(event);
    const change =
        event.kind === "log_updated" ? (event.data as { from?: unknown; to?: unknown }) : null;

    return (
        <li>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls={detailsId}
                className={cn(
                    "flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-2.5 text-left lift hover:bg-surface-hover",
                    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                    open && "bg-surface-hover"
                )}
            >
                <Face event={event} />

                <span className="min-w-0 flex-1">
                    <span className="block text-body-sm break-words text-content-secondary">
                        <span className="font-medium text-content">{summary.who}</span> {summary.action}
                        {summary.target && (
                            <>
                                {" "}
                                <span className="font-medium text-content">{summary.target}</span>
                            </>
                        )}
                        {summary.after && <> {summary.after}</>}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-label-sm text-content-muted">
                        {mark && (
                            <span className={cn("inline-flex items-center gap-1", mark.className)}>
                                <mark.icon size={11} aria-hidden />
                                {mark.label}
                            </span>
                        )}
                        {summary.rating !== null && <RatingBadge value={summary.rating} />}
                        <time dateTime={event.createdAt}>{timeInDay(event.createdAt, day) || relativeTime(event.createdAt)}</time>
                    </span>
                </span>

                {event.game && (
                    <GameCover
                        coverUrl={event.game.coverUrl}
                        title={event.game.title}
                        className="aspect-3/4 w-9 shrink-0 overflow-hidden rounded-xs shadow-cover"
                    />
                )}
            </button>

            {open && (
                <div id={detailsId} className="pb-2 pl-2 sm:pl-14">
                    <div className={plateClass("pressed", "shallow", "flex flex-col gap-3 px-3.5 py-3")}>
                        <LedgerList>
                            <LedgerRow label="When" value={at(event.createdAt)} />
                            <LedgerRow label="Recorded as" value={event.kind} />
                            {change && (
                                <LedgerRow
                                    label="Change"
                                    value={<span className="break-all">{JSON.stringify(change.from)} → {JSON.stringify(change.to)}</span>}
                                />
                            )}
                            <LedgerRow label="Event" value={`#${event.id}`} rule={false} />
                        </LedgerList>

                        {event.excerpt && (
                            <blockquote className="border-l-2 border-strong pl-3 text-body-sm break-words text-content-secondary">
                                {event.excerpt}
                            </blockquote>
                        )}

                        {event.data.backfilled === true && (
                            <p className="text-label-sm text-content-muted">
                                Recovered from what was already here when the log began, so it
                                shows the row as it stands now rather than as it was then.
                            </p>
                        )}

                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                            {summary.href && summary.target && (
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
                                    Only {event.actor.username}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </li>
    );
};

export default ActivityRow;

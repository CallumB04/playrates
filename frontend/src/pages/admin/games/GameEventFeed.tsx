import { useState } from "react";
import { Link } from "react-router-dom";
import {
    GAME_EVENT_GROUP_NAMES,
    type AdminGameEvent,
    type GameEventGroup,
} from "@playrates/shared";
import { cardClass } from "../../../components/ui/Card";
import Chip from "../../../components/ui/Chip";
import EmptyPlate, { EmptyNote } from "../../../components/ui/EmptyPlate";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import GameCover from "../../../components/game/GameCover";
import LedgerRow, { LedgerList } from "../../../components/ui/LedgerRow";
import { plateClass } from "../../../components/ui/Plate";
import { cn } from "../../../lib/cn";
import { relativeTime } from "../../../lib/format";
import { useAdminGameEvents } from "../../../hooks/queries/useAdmin";
import SectionHeader from "../components/SectionHeader";
import ShowOlder from "../components/ShowOlder";
import { SeeAllButton, SeeAllModal } from "../components/SeeAll";
import { useSeeAll } from "../components/useSeeAll";
import { groupByDay, timeInDay } from "../lib/plot";
import {
    GAME_GROUP_LABELS,
    SOURCE_WORDS,
    gameEventMark,
    gameEventSummary,
} from "./gamePresentation";

const EventRow = ({ event, day }: { event: AdminGameEvent; day: string }) => {
    const [open, setOpen] = useState(false);
    const { title, text } = gameEventSummary(event);
    const mark = gameEventMark(event);
    const facts = Object.entries(event.data).filter(([key]) => key !== "title");

    return (
        <li>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className={cn(
                    "flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-2.5 text-left lift hover:bg-surface-hover",
                    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                    open && "bg-surface-hover"
                )}
            >
                {event.game ? (
                    <GameCover
                        coverUrl={event.game.coverUrl}
                        title={event.game.title}
                        className="aspect-3/4 w-9 shrink-0 overflow-hidden rounded-xs shadow-cover"
                    />
                ) : (
                    // A call to RAWG is about many games or none; its place
                    // stays so the sentences still line up.
                    <span
                        aria-hidden
                        className="aspect-3/4 w-9 shrink-0 rounded-xs border border-dashed border-strong"
                    />
                )}
                <span className="min-w-0 flex-1">
                    <span className="block text-body-sm break-words text-content-secondary">
                        {title && (
                            <span className="font-medium text-content">
                                {title}{" "}
                            </span>
                        )}
                        {text}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-label-sm text-content-muted">
                        {mark && (
                            <span
                                className={cn(
                                    "inline-flex items-center gap-1",
                                    mark.className
                                )}
                            >
                                <mark.icon size={11} aria-hidden />
                                {mark.label}
                            </span>
                        )}
                        {event.source && (
                            <span>
                                {SOURCE_WORDS[event.source] ?? event.source}
                            </span>
                        )}
                        <time dateTime={event.createdAt}>
                            {timeInDay(event.createdAt, day) ||
                                relativeTime(event.createdAt)}
                        </time>
                    </span>
                </span>
            </button>

            {open && (
                <div className="pb-2 pl-2 sm:pl-14">
                    <div
                        className={plateClass(
                            "pressed",
                            "shallow",
                            "flex flex-col gap-3 px-3.5 py-3"
                        )}
                    >
                        <LedgerList>
                            <LedgerRow
                                label="When"
                                value={new Date(event.createdAt).toLocaleString(
                                    "en-GB",
                                    { dateStyle: "medium", timeStyle: "short" }
                                )}
                            />
                            <LedgerRow label="Recorded as" value={event.kind} />
                            {event.game?.rawgId && (
                                <LedgerRow
                                    label="RAWG id"
                                    value={event.game.rawgId}
                                />
                            )}
                            {facts.map(([key, value], i) => (
                                <LedgerRow
                                    key={key}
                                    label={key}
                                    value={
                                        <span className="break-all">
                                            {typeof value === "string"
                                                ? value
                                                : JSON.stringify(value)}
                                        </span>
                                    }
                                    rule={i < facts.length - 1}
                                />
                            ))}
                        </LedgerList>
                        {event.game && (
                            <Link
                                to={`/game/${event.game.id}`}
                                className="inline-flex min-h-11 items-center text-label font-medium text-brand underline-offset-2 hover:underline sm:min-h-0"
                            >
                                Open {event.game.title}
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </li>
    );
};

const Days = ({ events }: { events: AdminGameEvent[] }) => (
    <div className={cardClass("px-1.5 pt-1 pb-2 sm:px-2", { padding: "none" })}>
        {groupByDay(events, (e) => e.createdAt).map((day) => (
            <section key={day.key}>
                <h3 className="px-2 pt-3.5 pb-1 text-label text-content-muted">
                    {day.label}
                </h3>
                <ul className="flex flex-col">
                    {day.items.map((event) => (
                        <EventRow
                            key={event.id}
                            event={event}
                            day={day.label}
                        />
                    ))}
                </ul>
            </section>
        ))}
    </div>
);

/** The whole log, filterable, in the popup behind "See all". */
const FullLog = () => {
    const [group, setGroup] = useState<GameEventGroup | undefined>();
    const feed = useAdminGameEvents(group);
    const events = feed.data?.pages.flatMap((page) => page.data) ?? [];

    return (
        <>
            <div className="mb-4 flex flex-wrap gap-2">
                <Chip selected={!group} onClick={() => setGroup(undefined)}>
                    Everything
                </Chip>
                {GAME_EVENT_GROUP_NAMES.map((name) => (
                    <Chip
                        key={name}
                        selected={group === name}
                        onClick={() => setGroup(name)}
                    >
                        {GAME_GROUP_LABELS[name]}
                    </Chip>
                ))}
            </div>
            {feed.isPending ? (
                <TextSkeleton lines={6} />
            ) : events.length === 0 ? (
                <EmptyPlate title="Nothing of that kind yet" />
            ) : (
                <div
                    className={cn(
                        "transition-opacity",
                        feed.isPlaceholderData && "opacity-60"
                    )}
                >
                    <Days events={events} />
                    <ShowOlder
                        hasMore={feed.hasNextPage}
                        loading={feed.isFetchingNextPage}
                        onClick={() => feed.fetchNextPage()}
                        end="That’s where the log begins."
                    />
                </div>
            )}
        </>
    );
};

/** The last five things to happen to the catalogue; the rest behind a
 *  popup. */
const GameEventFeed = () => {
    const feed = useAdminGameEvents(undefined);
    const events = (feed.data?.pages[0]?.data ?? []).slice(0, 5);
    const all = useSeeAll();

    return (
        <section>
            <SectionHeader
                title="Latest in the catalogue"
                trailing={
                    events.length > 0 && <SeeAllButton onClick={all.show} />
                }
            />
            {feed.isPending ? (
                <TextSkeleton lines={5} />
            ) : events.length === 0 ? (
                <EmptyNote>
                    Nothing yet. Arrivals, new art and calls to RAWG show up
                    here.
                </EmptyNote>
            ) : (
                <Days events={events} />
            )}
            {all.open && (
                <SeeAllModal title="The catalogue log" onClose={all.hide} wide>
                    <FullLog />
                </SeeAllModal>
            )}
        </section>
    );
};

export default GameEventFeed;

import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import {
    GAME_EVENT_GROUP_NAMES,
    type AdminGameEvent,
    type GameEventGroup,
} from "@playrates/shared";
import Panel from "../../../components/ui/Panel";
import Chip from "../../../components/ui/Chip";
import EmptyPlate from "../../../components/ui/EmptyPlate";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import GameCover from "../../../components/game/GameCover";
import { cn } from "../../../lib/cn";
import { relativeTime } from "../../../lib/format";
import { useAdminGameEvents } from "../../../hooks/queries/useAdmin";
import LoadMore from "../components/LoadMore";
import {
    GAME_GROUP_TONES,
    gameEventIcon,
    gameEventSummary,
    gameEventTone,
} from "./gamePresentation";

const SOURCES: Record<string, string> = {
    search: "a search",
    page_view: "someone opening the game",
    manual_pull: "a manual pull",
    import: "an import",
    admin: "you",
};

const EventRow = ({ event }: { event: AdminGameEvent }) => {
    const [open, setOpen] = useState(false);
    const { title, text } = gameEventSummary(event);
    const tone = gameEventTone(event);
    const Icon = gameEventIcon(event.kind);

    return (
        <li className="relative overflow-hidden rounded-md border border-subtle bg-surface-raised">
            <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", tone.bar)} />
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="flex w-full cursor-pointer items-center gap-3 py-2.5 pr-3 pl-4 text-left hover:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
            >
                <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-sunken", tone.icon)}>
                    <Icon size={15} aria-hidden />
                </span>
                <span className="min-w-0 flex-1 text-body-sm break-words text-content-secondary">
                    {title && <span className="font-medium text-content">{title} </span>}
                    {text}
                    <time dateTime={event.createdAt} className="mt-0.5 block text-label-sm text-content-muted sm:hidden">
                        {relativeTime(event.createdAt)}
                    </time>
                </span>
                {event.game && (
                    <GameCover coverUrl={event.game.coverUrl} title={event.game.title} className="hidden w-7 shrink-0 rounded-xs sm:block" />
                )}
                <time dateTime={event.createdAt} className="hidden w-20 shrink-0 text-right text-label-sm text-content-muted sm:block">
                    {relativeTime(event.createdAt)}
                </time>
                <ChevronDown size={16} aria-hidden className={cn("shrink-0 text-content-muted transition-transform", open && "rotate-180")} />
            </button>
            {open && (
                <div className="flex flex-col gap-2 border-t border-subtle bg-surface-sunken/40 py-3 pr-3 pl-4 text-body-sm sm:pl-15">
                    <p className="text-content-secondary">
                        {new Date(event.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                        {event.source && <> · caused by {SOURCES[event.source] ?? event.source}</>}
                        {!event.source && " · seen in the catalogue itself"}
                        {event.actorUsername && event.source !== "admin" && <> · {event.actorUsername}</>}
                    </p>
                    <pre className="overflow-x-auto rounded-sm bg-surface-sunken p-2 font-mono text-label-sm text-content-secondary">
                        {JSON.stringify(event.data, null, 2)}
                    </pre>
                    {event.game && (
                        <Link to={`/game/${event.game.id}`} className="inline-flex min-h-11 items-center text-brand underline-offset-2 hover:underline sm:min-h-0">
                            Open {event.game.title}
                        </Link>
                    )}
                </div>
            )}
        </li>
    );
};

/** Everything that happens to the catalogue, and why. */
const GameEventFeed = () => {
    const [group, setGroup] = useState<GameEventGroup | undefined>();
    const feed = useAdminGameEvents(group);
    const events = feed.data?.pages.flatMap((page) => page.data) ?? [];

    return (
        <Panel title="Catalogue log">
            <div className="mb-4 flex flex-wrap gap-2">
                <Chip selected={!group} onClick={() => setGroup(undefined)}>
                    Everything
                </Chip>
                {GAME_EVENT_GROUP_NAMES.map((name) => (
                    <Chip
                        key={name}
                        selected={group === name}
                        dotClassName={GAME_GROUP_TONES[name].bar}
                        onClick={() => setGroup(name)}
                    >
                        {GAME_GROUP_TONES[name].label}
                    </Chip>
                ))}
            </div>
            {feed.isPending ? (
                <TextSkeleton lines={6} />
            ) : events.length === 0 ? (
                <EmptyPlate
                    title="Nothing logged yet"
                    body="The log began with the admin dashboard; earlier imports aren't in it."
                />
            ) : (
                <div className={feed.isPlaceholderData ? "opacity-60 transition-opacity" : undefined}>
                    <ul className="flex flex-col gap-1.5">
                        {events.map((event) => (
                            <EventRow key={event.id} event={event} />
                        ))}
                    </ul>
                    <LoadMore
                        hasMore={feed.hasNextPage}
                        loading={feed.isFetchingNextPage}
                        onClick={() => feed.fetchNextPage()}
                    />
                </div>
            )}
        </Panel>
    );
};

export default GameEventFeed;

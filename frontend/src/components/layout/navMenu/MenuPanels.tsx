import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
    ArrowRight,
    Flame,
    Award,
    BarChart3,
    CalendarClock,
    Clock,
    Megaphone,
    MessagesSquare,
    PenLine,
    Sparkles,
    Star,
    Trophy,
    Users,
    type LucideIcon,
} from "lucide-react";
import {
    eventPath,
    hubPath,
    igdbSized,
    type EventSummary,
} from "@playrates/shared";
import {
    usePatchNotes,
    useTrendingThreads,
} from "../../../hooks/queries/useCommunity";
import { useEvents } from "../../../hooks/queries/useEvents";
import { useGames } from "../../../hooks/queries/useGames";
import { popularOfYear } from "../../../lib/popularOfYear";
import { threadPath, newThreadPath } from "../../community/paths";
import EventDate from "../../events/EventDate";
import EventLogo from "../../events/EventLogo";
import Skeleton from "../../ui/Skeleton";
import { cn } from "../../../lib/cn";
import {
    bestOfYears,
    librarySortPath,
    menuEvents,
    MENU_GENRES,
    MENU_PLATFORMS,
    type NavMenuKey,
} from "./navMenus";

interface PanelProps {
    /** Called on following a link, so the menu closes behind it. */
    onNavigate: () => void;
}

const FOCUS = "focus-visible:outline-2 focus-visible:outline-brand";

const HEADING =
    "px-2.5 pt-1 pb-2 text-label-sm font-medium tracking-[0.14em] text-content-muted uppercase";

const Column = ({
    title,
    children,
    className,
}: {
    title: string;
    children: ReactNode;
    className?: string;
}) => (
    <div className={cn("flex min-w-40 flex-col", className)}>
        <p className={HEADING}>{title}</p>
        <ul className="flex flex-col gap-0.5">{children}</ul>
    </div>
);

/** A link in a column. With an icon, the icon sits on a tile of its own
 *  that lights with the row. */
const Item = ({
    to,
    icon: Icon,
    onNavigate,
    children,
}: {
    to: string;
    icon?: LucideIcon;
    onNavigate: () => void;
    children: ReactNode;
}) => (
    <li>
        <Link
            to={to}
            onClick={onNavigate}
            className={cn(
                "group/item flex items-center gap-3 rounded-md px-2.5 py-1.5 text-body-sm text-content-secondary transition-colors hover:bg-surface-hover hover:text-content",
                FOCUS
            )}
        >
            {Icon && (
                <span className="grid size-8 shrink-0 place-items-center rounded-md border border-subtle bg-surface text-content-muted transition-colors group-hover/item:border-strong group-hover/item:text-brand-text">
                    <Icon size={15} aria-hidden />
                </span>
            )}
            {children}
        </Link>
    </li>
);

/**
 * The menu's one picture: something worth going to, set apart on a sunken
 * surface beside the lists, so the menu reads as a lead and its links
 * rather than columns of equal weight.
 */
const Feature = ({
    to,
    onNavigate,
    media,
    children,
}: {
    to: string;
    onNavigate: () => void;
    media: ReactNode;
    children: ReactNode;
}) => (
    <Link
        to={to}
        onClick={onNavigate}
        className={cn(
            "group/feature flex w-60 shrink-0 flex-col gap-3 rounded-md bg-surface-sunken p-3 transition-colors hover:bg-surface-hover",
            FOCUS
        )}
    >
        <div className="relative isolate min-h-28 flex-1 overflow-hidden rounded-sm bg-surface">
            {media}
        </div>
        <div className="flex flex-col gap-1 px-0.5 pb-0.5">{children}</div>
    </Link>
);

const FeatureTitle = ({ children }: { children: ReactNode }) => (
    <p className="flex items-center gap-1.5 text-body-sm font-semibold text-content">
        <span className="line-clamp-2">{children}</span>
        <ArrowRight
            size={14}
            aria-hidden
            className="shrink-0 text-content-muted transition-transform duration-200 ease-[var(--ease-glide)] group-hover/feature:translate-x-0.5 group-hover/feature:text-content"
        />
    </p>
);

/** Wide art filling a feature's picture. */
const Art = ({ url }: { url: string | null | undefined }) =>
    url ? (
        <img
            src={igdbSized(url, "screenshot_med")}
            alt=""
            decoding="async"
            className="absolute inset-0 size-full object-cover transition-transform duration-500 ease-[var(--ease-glide)] group-hover/feature:scale-[1.03]"
        />
    ) : null;

/** A strip along the foot of a menu, for the one thing that runs across
 *  it. */
const Foot = ({ children }: { children: ReactNode }) => (
    <div className="mt-2 -mr-4 -mb-2 -ml-2 flex items-center gap-x-4 gap-y-1 border-t border-subtle px-5 py-3 text-body-sm">
        {children}
    </div>
);

const LibraryPanel = ({ onNavigate }: PanelProps) => {
    const [year, lastYear] = bestOfYears();
    const best = { kind: "year", year } as const;
    const { data } = useGames(popularOfYear(year));
    const banners = (data?.data ?? []).filter((g) => g.artworkUrl).slice(0, 3);
    return (
        <>
            <div className="flex gap-3">
                <Feature
                    to={hubPath(best)}
                    onNavigate={onNavigate}
                    media={
                        // The year's games people know best: the first
                        // across the top, the next two side by side.
                        <div className="grid size-full grid-cols-2 grid-rows-[3fr_2fr] gap-0.5">
                            {banners.map((game, i) => (
                                <span
                                    key={game.id}
                                    className={cn(
                                        "relative min-h-0 overflow-hidden",
                                        i === 0 && "col-span-2"
                                    )}
                                >
                                    <Art url={game.artworkUrl} />
                                </span>
                            ))}
                        </div>
                    }
                >
                    <FeatureTitle>Best of {year}</FeatureTitle>
                </Feature>
                <Column title="Browse">
                    <Item
                        to={librarySortPath("logged")}
                        icon={BarChart3}
                        onNavigate={onNavigate}
                    >
                        Most logged
                    </Item>
                    <Item
                        to={librarySortPath("rating")}
                        icon={Star}
                        onNavigate={onNavigate}
                    >
                        Highest rated
                    </Item>
                    <Item
                        to={librarySortPath("critic")}
                        icon={Award}
                        onNavigate={onNavigate}
                    >
                        Critics’ favourites
                    </Item>
                    <Item
                        to={librarySortPath("released")}
                        icon={Sparkles}
                        onNavigate={onNavigate}
                    >
                        Newest releases
                    </Item>
                    <Item
                        to={hubPath({ kind: "upcoming" })}
                        icon={CalendarClock}
                        onNavigate={onNavigate}
                    >
                        Upcoming games
                    </Item>
                    <Item
                        to={hubPath({ kind: "year", year: lastYear })}
                        icon={Trophy}
                        onNavigate={onNavigate}
                    >
                        Best of {lastYear}
                    </Item>
                </Column>
                <Column title="Genres" className="min-w-32">
                    {MENU_GENRES.map((genre) => (
                        <Item
                            key={genre.slug}
                            to={hubPath({ kind: "genre", ...genre })}
                            onNavigate={onNavigate}
                        >
                            {genre.name}
                        </Item>
                    ))}
                </Column>
            </div>
            <Foot>
                <span className="text-content-muted">Platforms</span>
                {MENU_PLATFORMS.map((platform) => (
                    <Link
                        key={platform.slug}
                        to={hubPath({ kind: "platform", ...platform })}
                        onClick={onNavigate}
                        className={cn(
                            "font-medium text-content-secondary transition-colors hover:text-content",
                            FOCUS
                        )}
                    >
                        {platform.name}
                    </Link>
                ))}
            </Foot>
        </>
    );
};

/** A trending thread's place, as the community page marks it. */
const TrendRank = ({ rank }: { rank: number }) => (
    <p className="flex items-center gap-1 text-label-sm">
        <Flame size={12} aria-hidden className="text-brand-text" />
        <span className="font-semibold text-brand-text tabular-nums">
            #{rank}
        </span>
        <span className="text-content-muted">Trending</span>
    </p>
);

const CommunityPanel = ({ onNavigate }: PanelProps) => {
    const { data: trending, isPending } = useTrendingThreads(3);
    const { data: patchNotes } = usePatchNotes();
    const [top, ...rest] = trending ?? [];
    const topGame = top?.subject.kind === "game" ? top.subject.game : null;
    return (
        <>
            <div className="flex gap-3">
                {isPending ? (
                    <Skeleton className="h-52 w-60 shrink-0 rounded-md" />
                ) : (
                    top && (
                        <Feature
                            to={threadPath(top.id)}
                            onNavigate={onNavigate}
                            media={
                                <>
                                    <Art
                                        url={
                                            topGame?.artworkUrl ??
                                            topGame?.coverUrl
                                        }
                                    />
                                    {/* The game it's about, on its art. */}
                                    {topGame?.coverUrl && (
                                        <img
                                            src={igdbSized(
                                                topGame.coverUrl,
                                                "cover_big"
                                            )}
                                            alt=""
                                            decoding="async"
                                            className="absolute bottom-2 left-2 aspect-3/4 w-11 rounded-xs object-cover shadow-lifted ring-1 ring-strong"
                                        />
                                    )}
                                </>
                            }
                        >
                            <TrendRank rank={top.rank} />
                            <FeatureTitle>{top.title}</FeatureTitle>
                            {topGame && (
                                <p className="truncate text-label-sm text-content-muted">
                                    {topGame.title}
                                </p>
                            )}
                        </Feature>
                    )
                )}
                <Column title="Community">
                    <Item
                        to="/community"
                        icon={MessagesSquare}
                        onNavigate={onNavigate}
                    >
                        All threads
                    </Item>
                    <Item
                        to="/community?sort=new"
                        icon={Clock}
                        onNavigate={onNavigate}
                    >
                        Newest threads
                    </Item>
                    <Item to="/people" icon={Users} onNavigate={onNavigate}>
                        People
                    </Item>
                    <Item
                        to={newThreadPath()}
                        icon={PenLine}
                        onNavigate={onNavigate}
                    >
                        Start a thread
                    </Item>
                </Column>
                {rest.length > 0 && (
                    <div className="flex w-60 flex-col">
                        <p className={HEADING}>Also trending</p>
                        <ol className="flex flex-col gap-0.5">
                            {rest.map((thread) => (
                                <li key={thread.id}>
                                    <Link
                                        to={threadPath(thread.id)}
                                        onClick={onNavigate}
                                        className={cn(
                                            "group/item flex items-start gap-3 rounded-md px-2.5 py-2 transition-colors hover:bg-surface-hover",
                                            FOCUS
                                        )}
                                    >
                                        <span className="flex min-w-0 flex-col gap-0.5">
                                            <TrendRank rank={thread.rank} />
                                            <span className="line-clamp-2 text-body-sm font-medium text-content">
                                                {thread.title}
                                            </span>
                                            <span className="truncate text-label-sm text-content-muted">
                                                {thread.subject.kind === "game"
                                                    ? thread.subject.game.title
                                                    : "Patch notes"}
                                            </span>
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ol>
                    </div>
                )}
            </div>
            {patchNotes && (
                <Foot>
                    <Link
                        to={threadPath(patchNotes.thread.id)}
                        onClick={onNavigate}
                        className={cn(
                            "group/foot flex min-w-0 items-center gap-2",
                            FOCUS
                        )}
                    >
                        <Megaphone
                            size={15}
                            aria-hidden
                            className="shrink-0 text-brand-text"
                        />
                        <span className="font-medium text-content">
                            Patch notes
                        </span>
                        {patchNotes.latest?.title && (
                            <span className="truncate text-content-muted group-hover/foot:text-content-secondary">
                                {patchNotes.latest.title}
                            </span>
                        )}
                    </Link>
                </Foot>
            )}
        </>
    );
};

/** A column of events in the menu, each with its date. */
const EventColumn = ({
    title,
    events,
    onNavigate,
}: {
    title: string;
    events: EventSummary[];
    onNavigate: () => void;
}) => (
    <div className="flex flex-col">
        <p className={HEADING}>{title}</p>
        <ul className="flex flex-col gap-0.5">
            {events.map((event) => (
                <li key={event.slug}>
                    <Link
                        to={eventPath(event.slug)}
                        onClick={onNavigate}
                        className={cn(
                            "flex items-center gap-3 rounded-md px-2.5 py-2 transition-colors hover:bg-surface-hover",
                            FOCUS
                        )}
                    >
                        <EventDate
                            iso={event.startsAt}
                            past={event.timing === "past"}
                            size="sm"
                        />
                        <span className="line-clamp-2 min-w-0 text-body-sm font-medium text-content">
                            {event.name}
                        </span>
                    </Link>
                </li>
            ))}
        </ul>
    </div>
);

const EventsPanel = ({ onNavigate }: PanelProps) => {
    const { data: events, isPending } = useEvents();
    const { lead, upcoming, past } = menuEvents(events ?? []);
    return (
        <>
            <div className="flex gap-3">
                {isPending ? (
                    <Skeleton className="h-52 w-60 shrink-0 rounded-md" />
                ) : (
                    lead && (
                        <Feature
                            to={eventPath(lead.slug)}
                            onNavigate={onNavigate}
                            media={
                                <>
                                    <Art url={lead.artworkUrl} />
                                    {lead.logo && (
                                        <span className="absolute inset-0 flex items-end bg-media-scrim p-3">
                                            <EventLogo
                                                logo={lead.logo}
                                                className="h-6 text-content-on-media"
                                            />
                                        </span>
                                    )}
                                </>
                            }
                        >
                            {lead.timing === "live" && (
                                <p className="flex items-center gap-1.5 text-label-sm font-semibold text-content">
                                    <span
                                        aria-hidden
                                        className="size-1.5 rounded-full bg-danger"
                                    />
                                    On now
                                </p>
                            )}
                            <FeatureTitle>{lead.name}</FeatureTitle>
                        </Feature>
                    )
                )}
                {/* Coming up over past, one column beside the lead. */}
                {(upcoming.length > 0 || past.length > 0) && (
                    <div className="flex w-64 flex-col gap-3">
                        {upcoming.length > 0 && (
                            <EventColumn
                                title="Coming up"
                                events={upcoming}
                                onNavigate={onNavigate}
                            />
                        )}
                        {past.length > 0 && (
                            <EventColumn
                                title="Past"
                                events={past}
                                onNavigate={onNavigate}
                            />
                        )}
                    </div>
                )}
            </div>
            <Foot>
                <Link
                    to="/events"
                    onClick={onNavigate}
                    className={cn(
                        "inline-flex items-center gap-1.5 font-medium text-content-secondary transition-colors hover:text-content",
                        FOCUS
                    )}
                >
                    All events
                    <ArrowRight size={14} aria-hidden />
                </Link>
            </Foot>
        </>
    );
};

/** What each of the bar's menus holds. Loaded on its own, after the page,
 *  so the bar costs the first load almost nothing. */
const MenuPanel = ({ menu, onNavigate }: PanelProps & { menu: NavMenuKey }) => {
    switch (menu) {
        case "library":
            return <LibraryPanel onNavigate={onNavigate} />;
        case "community":
            return <CommunityPanel onNavigate={onNavigate} />;
        case "events":
            return <EventsPanel onNavigate={onNavigate} />;
    }
};

export default MenuPanel;

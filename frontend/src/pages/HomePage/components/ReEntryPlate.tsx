import { useState } from "react";
import { Link } from "react-router-dom";
import { Gamepad2, Pencil } from "lucide-react";
import { igdbSized, type UserStats } from "@playrates/shared";
import type { GameLogWithGame } from "../../../api";
import GameCover from "../../../components/game/GameCover";
import Button from "../../../components/ui/Button";
import Progress from "../../../components/ui/Progress";
import RatingBadge from "../../../components/ui/RatingBadge";
import { buttonClass } from "../../../components/ui/buttonClass";
import { cardClass } from "../../../components/ui/cardClass";
import Skeleton from "../../../components/ui/Skeleton";
import YearChart from "./YearChart";
import { usePlayedOn } from "../../../components/gamelog/usePlayedOn";
import {
    GAME_STATUSES,
    STATUS_PRESENTATION,
} from "../../../constants/gameStatus";
import {
    formatCount,
    formatHours,
    formatPercent,
    relativeTime,
} from "../../../lib/format";
import { completionTone } from "../../../lib/completionTone";
import { cn } from "../../../lib/cn";
import { shelfPath } from "../../../lib/profilePaths";

interface ReEntryPlateProps {
    username: string;
    /** First name where they have set one, username otherwise. */
    displayName: string;
    /** Nothing logged yet, so not "welcome back". Undefined until their
     *  logs arrive, and the greeting waits rather than guess. */
    isNew: boolean | undefined;
    /** The games on the go, most recently touched first. Undefined while
     *  loading, and so are the two below. */
    playing: GameLogWithGame[] | undefined;
    /** How many games on each shelf, all time. */
    shelves: Record<string, number> | undefined;
    /** This year's played logs, for the chart. */
    yearLogs: GameLogWithGame[] | undefined;
    yearStats: UserStats | undefined;
    onUpdateLog: (log: GameLogWithGame) => void;
}

const EYEBROW = "text-label-sm font-medium tracking-[0.14em] uppercase";

/** Covers in the row under the game on the go, before the rest are counted. */
const ON_THE_GO_SHOWN = 5;

const today = () =>
    new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
    }).format(new Date());

const completionOf = (log: GameLogWithGame): number | null =>
    log.achievementsTotal
        ? Math.min(1, (log.achievementsCompleted ?? 0) / log.achievementsTotal)
        : null;

const waiting = (backlog: number) =>
    `${formatCount(backlog)} ${backlog === 1 ? "game" : "games"}`;

/** A run's figures on one line, each in the page's own colour with a word
 *  saying what it is. Only those it has: a dash would be noise here. */
const RunFigures = ({ log }: { log: GameLogWithGame }) => {
    const completion = completionOf(log);
    if (log.hoursPlayed === null && log.rating === null && completion === null)
        return (
            <p className="text-body-sm text-content-muted">
                No hours or rating yet
            </p>
        );
    return (
        <dl className="flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-2 text-label-sm text-content-secondary sm:flex-none">
            {log.hoursPlayed !== null && (
                <div className="flex items-baseline gap-1.5">
                    <dd className="font-mono text-body font-medium text-content">
                        {formatHours(log.hoursPlayed)}
                    </dd>
                    <dt>played</dt>
                </div>
            )}
            {log.rating !== null && (
                <div className="flex items-baseline gap-1.5">
                    <dd>
                        <RatingBadge value={log.rating} size="md" />
                    </dd>
                    <dt>your rating</dt>
                </div>
            )}
            {completion !== null && (
                <div className="flex items-center gap-2">
                    <dd className="flex items-center gap-2">
                        <Progress
                            size="sm"
                            value={completion}
                            label="Achievements earned"
                            fillClassName={completionTone(completion).fill}
                            className="w-16"
                        />
                        <span
                            className={cn(
                                "font-mono text-body font-medium",
                                completionTone(completion).text
                            )}
                        >
                            {formatPercent(completion)}
                        </span>
                    </dd>
                    <dt>achievements</dt>
                </div>
            )}
        </dl>
    );
};

/** Every game on the go as a small cover, the one shown above ringed: a
 *  row that never moves, so picking another only moves the ring. */
const OnTheGo = ({
    playing,
    openId,
    onTheGo,
    username,
    onOpen,
}: {
    playing: GameLogWithGame[];
    openId: number;
    onTheGo: number;
    username: string;
    onOpen: (id: number) => void;
}) => {
    const overflow = onTheGo > ON_THE_GO_SHOWN;
    const shown = playing.slice(
        0,
        overflow ? ON_THE_GO_SHOWN - 1 : ON_THE_GO_SHOWN
    );
    return (
        <div className="flex flex-col gap-2">
            <p className="text-label-sm text-content-muted">
                On the go{" "}
                <span className="font-mono text-content-secondary">
                    {formatCount(onTheGo)}
                </span>
            </p>
            <ul className="flex items-center gap-2">
                {shown.map((log) => {
                    const open = log.id === openId;
                    return (
                        <li key={log.id}>
                            <button
                                type="button"
                                onClick={() => onOpen(log.id)}
                                aria-pressed={open}
                                aria-label={log.game?.title ?? "A game"}
                                className={cn(
                                    "block aspect-3/4 w-11 cursor-pointer overflow-hidden rounded-xs lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                                    open
                                        ? "ring-2 ring-brand ring-offset-2 ring-offset-surface-raised"
                                        : "opacity-75 hover:opacity-100"
                                )}
                            >
                                <GameCover
                                    coverUrl={log.game?.coverUrl ?? null}
                                    title={log.game?.title ?? ""}
                                    className="size-full"
                                />
                            </button>
                        </li>
                    );
                })}
                {overflow && (
                    <li>
                        <Link
                            to={shelfPath(username, "playing")}
                            aria-label={`See all ${formatCount(onTheGo)}`}
                            className="grid aspect-3/4 w-11 place-items-center rounded-xs border border-subtle bg-surface-sunken font-mono text-label-sm font-semibold text-content-secondary lift hover:border-strong hover:text-content"
                        >
                            +{formatCount(onTheGo - shown.length)}
                        </Link>
                    </li>
                )}
            </ul>
        </div>
    );
};

/** Nothing on the go: the one thing to do next, at every width. */
const NothingOnTheGo = ({
    username,
    backlog,
}: {
    username: string;
    backlog: number;
}) => (
    <section
        aria-labelledby="now-playing"
        className={cardClass(
            "flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5"
        )}
    >
        <div className="flex min-w-0 flex-1 items-start gap-3.5 sm:items-center sm:gap-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-brand-subtle text-brand-text sm:size-12">
                <Gamepad2 size={20} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
                <h2
                    id="now-playing"
                    className="text-body font-medium text-content"
                >
                    Nothing on the go
                </h2>
                <p className="mt-1 text-body-sm text-content-secondary">
                    {backlog > 0
                        ? `${waiting(backlog)} waiting in your backlog. Pick one to start, or find something new.`
                        : "Find something to play, and it’ll show here while you play it."}
                </p>
            </div>
        </div>
        <div className="flex flex-col gap-2 sm:shrink-0 sm:flex-row">
            {backlog > 0 && (
                <Link
                    to={shelfPath(username, "backlog")}
                    className={buttonClass("primary", "w-full sm:w-auto")}
                >
                    Pick from your backlog
                </Link>
            )}
            <Link
                to="/library"
                className={buttonClass(
                    backlog > 0 ? "secondary" : "primary",
                    "w-full sm:w-auto"
                )}
            >
                Browse the library
            </Link>
        </div>
    </section>
);

/** The card's own outline while what's on the go loads: a cover, a title
 *  and a line of figures, so nothing reads as empty before it is. */
const NowPlayingSkeleton = () => (
    <div
        aria-busy
        className={cardClass(
            "grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 gap-y-3 p-4 sm:gap-x-5 sm:p-5",
            { padding: "none" }
        )}
    >
        <Skeleton className="aspect-3/4 w-16 sm:row-span-2 sm:w-22" />
        <div className="flex min-w-0 flex-col gap-2 self-center sm:self-auto">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-3/5 sm:h-7" />
            <Skeleton className="h-3 w-32" />
        </div>
        <div className="col-span-2 flex items-center justify-between gap-4 sm:col-span-1 sm:col-start-2 sm:justify-start">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="size-11 sm:h-8 sm:w-20" />
        </div>
    </div>
);

/**
 * The game you're playing, in full, and the rest of what's on the go as
 * covers to switch between. The most recently touched leads, as "now"
 * means; nothing on the go asks for something to start instead.
 */
const NowPlaying = ({
    playing,
    username,
    shelves,
    onUpdateLog,
}: {
    playing: GameLogWithGame[] | undefined;
    username: string;
    shelves: Record<string, number> | undefined;
    onUpdateLog: (log: GameLogWithGame) => void;
}) => {
    const [openId, setOpenId] = useState<number | null>(null);
    const open = playing?.find((l) => l.id === openId) ?? playing?.[0];
    const playedOn = usePlayedOn()(open ?? { system: null, platform: null });

    // With nothing on the go, the call to action also waits for the
    // shelves: what it offers depends on the backlog.
    if (!playing || (!open && !shelves)) return <NowPlayingSkeleton />;
    if (!open?.game) {
        return (
            <NothingOnTheGo
                username={username}
                backlog={shelves?.backlog ?? 0}
            />
        );
    }

    const game = open.game;
    const PlatformIcon = playedOn.Icon;
    const onTheGo = Math.max(shelves?.playing ?? 0, playing.length);

    return (
        <section
            aria-labelledby="now-playing"
            className={cardClass("relative overflow-hidden", {
                padding: "none",
            })}
        >
            {/* The game's own art, faint and fading out before the words:
                enough to say which world you're in, never in the way. */}
            {game.artworkUrl && (
                // The art at near full strength, so it keeps its colour,
                // with the card's own surface laid over it where the words
                // are: solid behind the details, thinning towards the covers
                // on a wide card; on a phone, strongest around the title.
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                >
                    <img
                        key={game.id}
                        src={igdbSized(game.artworkUrl, "screenshot_big")}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="size-full animate-fade-up object-cover"
                    />
                    <div className="absolute inset-0 bg-linear-to-b from-surface-raised/70 via-surface-raised/88 via-55% to-surface-raised/95 sm:bg-linear-to-r sm:from-surface-raised sm:from-30% sm:via-surface-raised/82 sm:via-60% sm:to-surface-raised/45" />
                </div>
            )}
            <div className="relative flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:gap-8">
                {/* The figures sit under the title from a phone's width up;
                    on a phone they take the card's width under the cover. */}
                <div
                    key={open.id}
                    className="grid min-w-0 flex-1 animate-fade-up grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 gap-y-3 sm:gap-x-5"
                >
                    <Link
                        to={`/game/${game.id}`}
                        tabIndex={-1}
                        aria-hidden
                        className="shrink-0 lift sm:row-span-2"
                    >
                        <GameCover
                            coverUrl={game.coverUrl}
                            title={game.title}
                            className="aspect-3/4 w-16 overflow-hidden rounded-sm shadow-cover sm:w-22"
                        />
                    </Link>
                    <div className="min-w-0 self-center sm:self-auto">
                        <h2
                            id="now-playing"
                            className="text-label-sm text-content-muted"
                        >
                            Now playing
                        </h2>
                        <Link
                            to={`/game/${game.id}`}
                            className="mt-0.5 line-clamp-2 font-display text-xl leading-tight text-content hover:text-brand-text sm:text-2xl"
                        >
                            {game.title}
                        </Link>
                        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-label-sm text-content-secondary">
                            {playedOn.name && (
                                <span className="inline-flex items-center gap-1.5">
                                    <PlatformIcon size={13} aria-hidden />
                                    {playedOn.name}
                                </span>
                            )}
                            <span>Updated {relativeTime(open.updatedAt)}</span>
                        </p>
                    </div>
                    <div className="col-span-2 flex items-center justify-between gap-x-4 sm:col-span-1 sm:col-start-2 sm:flex-wrap sm:justify-start sm:gap-x-5 sm:gap-y-3">
                        <RunFigures log={open} />
                        {/* Its word from a phone's width up; on a phone, the
                            pencil alone keeps it on the figures' line. */}
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onUpdateLog(open)}
                            className="max-sm:size-11 max-sm:px-0"
                        >
                            <Pencil size={14} aria-hidden />
                            <span className="max-sm:sr-only">Update</span>
                        </Button>
                    </div>
                </div>

                {playing.length > 1 && (
                    <div className="border-t border-subtle pt-3.5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
                        <OnTheGo
                            playing={playing}
                            openId={open.id}
                            onTheGo={onTheGo}
                            username={username}
                            onOpen={setOpenId}
                        />
                    </div>
                )}
            </div>
        </section>
    );
};

/** Each shelf's own tint, for the square its mark sits in. Whole class
 *  names, so the stylesheet keeps them. */
const SHELF_TINT: Record<(typeof GAME_STATUSES)[number], string> = {
    played: "bg-status-played-quiet",
    playing: "bg-status-playing-quiet",
    backlog: "bg-status-backlog-quiet",
    wishlist: "bg-status-wishlist-quiet",
};

/** The four shelves as one bar of figures, quartered by hairlines, each
 *  quarter a link to its shelf. On a phone, a count over its name with a
 *  dot of the shelf's colour; with room, the mark in the shelf's tint
 *  beside them. */
const Shelves = ({
    username,
    shelves,
}: {
    /** Undefined before the account is known: the bar, but not yet links. */
    username?: string;
    shelves: Record<string, number> | undefined;
}) => (
    <nav
        aria-label="Your shelves"
        aria-busy={!shelves}
        className={cardClass(
            "grid grid-cols-4 divide-x divide-subtle overflow-hidden",
            { padding: "none" }
        )}
    >
        {GAME_STATUSES.map((status) => {
            const {
                label,
                icon: Icon,
                markTone,
                accent,
            } = STATUS_PRESENTATION[status];
            const count = shelves && formatCount(shelves[status] ?? 0);
            const cell =
                "group flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 px-1 py-2.5 transition-colors hover:bg-surface-hover/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand sm:flex-row sm:justify-start sm:gap-3 sm:px-4 sm:py-3";
            const body = (
                <>
                    <span
                        aria-hidden
                        className={cn(
                            "hidden size-8 shrink-0 place-items-center rounded-sm sm:grid",
                            SHELF_TINT[status]
                        )}
                    >
                        <Icon size={15} className={markTone} />
                    </span>
                    <span className="flex min-w-0 flex-col items-center gap-0.5 sm:items-start">
                        {count ? (
                            <span className="font-mono text-lg leading-tight font-semibold text-content tabular-nums sm:text-xl">
                                {count}
                            </span>
                        ) : (
                            // The figure's own line height, so nothing
                            // shifts when it lands.
                            <span className="flex h-[22.5px] items-center sm:h-[25px]">
                                <Skeleton className="h-4 w-6 sm:h-5 sm:w-8" />
                            </span>
                        )}
                        <span className="flex min-w-0 items-center gap-1.5 text-label-sm text-content-secondary group-hover:text-content">
                            <span
                                aria-hidden
                                className={cn(
                                    "size-1.5 shrink-0 rounded-full sm:hidden",
                                    accent
                                )}
                            />
                            <span className="truncate">{label}</span>
                        </span>
                    </span>
                </>
            );
            return username ? (
                <Link
                    key={status}
                    to={shelfPath(username, status)}
                    // Name first when read aloud, as the figure leads only
                    // for the eye.
                    aria-label={count ? `${label} ${count}` : label}
                    className={cell}
                >
                    {body}
                </Link>
            ) : (
                <div key={status} className={cell}>
                    {body}
                </div>
            );
        })}
    </nav>
);

/** This year in three figures and twelve bars, beside the greeting. */
const YearGlance = ({
    yearLogs,
    yearStats,
}: {
    yearLogs: GameLogWithGame[] | undefined;
    yearStats: UserStats | undefined;
}) => (
    <div className="w-[320px]" aria-busy={!yearStats || !yearLogs}>
        <div className="mb-2.5 flex items-center justify-between gap-4">
            <span className={cn(EYEBROW, "text-content-muted")}>
                Your {new Date().getFullYear()}
            </span>
            {yearStats ? (
                <span className="flex items-center gap-3 text-label-sm text-content-secondary">
                    <span>
                        <span className="font-mono text-content">
                            {formatCount(yearStats.gameCount)}
                        </span>{" "}
                        logged
                    </span>
                    <span className="font-mono text-content">
                        {formatHours(yearStats.hoursPlayed)}
                    </span>
                    {yearStats.averageRating != null && (
                        <RatingBadge value={yearStats.averageRating} />
                    )}
                </span>
            ) : (
                <Skeleton className="h-3 w-28" />
            )}
        </div>
        <YearChart
            logs={yearLogs ?? []}
            loading={!yearLogs}
            barsClassName="h-10"
            emptyNote="Nothing finished this year yet"
        />
    </div>
);

/** Today's date over the greeting, and the year beside them with room.
 *  Without a greeting yet, a bar of its size holds the place. */
const Greeting = ({
    greeting,
    yearLogs,
    yearStats,
}: {
    greeting: string | undefined;
    yearLogs: GameLogWithGame[] | undefined;
    yearStats: UserStats | undefined;
}) => (
    <div className="mb-1 flex flex-wrap items-end justify-between gap-x-10 gap-y-5 lg:mb-2">
        <div>
            <p className={cn(EYEBROW, "text-content-muted")}>{today()}</p>
            <h1
                id="home-greeting"
                className="mt-2 font-display text-[28px] leading-[1.05] text-content sm:text-[44px] lg:text-[52px]"
            >
                {greeting ?? (
                    <Skeleton className="my-[0.05em] h-[0.95em] w-[11ch] max-w-full" />
                )}
            </h1>
        </div>
        <div className="hidden lg:block">
            <YearGlance yearLogs={yearLogs} yearStats={yearStats} />
        </div>
    </div>
);

/** The landing's outline while the account itself is still loading. */
export const ReEntrySkeleton = () => (
    <div aria-busy className="flex flex-col gap-4 lg:gap-5">
        <Greeting
            greeting={undefined}
            yearLogs={undefined}
            yearStats={undefined}
        />
        <NowPlayingSkeleton />
        <Shelves shelves={undefined} />
    </div>
);

/**
 * The signed-in landing: a greeting, what's on the go, and the four shelves,
 * laid straight on the page rather than boxed together.
 */
const ReEntryPlate = ({
    username,
    displayName,
    isNew,
    playing,
    shelves,
    yearLogs,
    yearStats,
    onUpdateLog,
}: ReEntryPlateProps) => (
    <section
        aria-labelledby="home-greeting"
        className="flex flex-col gap-4 lg:gap-5"
    >
        <Greeting
            greeting={
                isNew === undefined
                    ? undefined
                    : `${isNew ? "Welcome" : "Welcome back"}, ${displayName}`
            }
            yearLogs={yearLogs}
            yearStats={yearStats}
        />

        <NowPlaying
            playing={playing}
            username={username}
            shelves={shelves}
            onUpdateLog={onUpdateLog}
        />
        <Shelves username={username} shelves={shelves} />
    </section>
);

export default ReEntryPlate;

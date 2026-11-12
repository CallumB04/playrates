import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Gamepad2, Pencil } from "lucide-react";
import { igdbSized, type Game, type UserStats } from "@playrates/shared";
import { logOnShelf, type GameLogWithGame } from "../../../api";
import HypeFlames from "../../../components/gamelog/HypeFlames";
import PlayGlyph from "../../../components/ui/PlayGlyph";
import LoadingSpinner from "../../../components/LoadingSpinner";
import { useNotify } from "../../../contexts/NotificationContext";
import { OFFER_DWELL_MS } from "../../../contexts/notificationQueue";
import { useDismiss } from "../../../hooks/useDismiss";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import {
    useLogMutations,
    useMyGameLogIds,
    useMyShelf,
} from "../../../hooks/queries/useGameLogs";
import GameCover from "../../../components/game/GameCover";
import ArtBackdrop from "../../../components/game/ArtBackdrop";
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
    todayIsoDate,
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
    /** This week's trending games, for one to suggest with nothing on the
     *  go and nothing on the backlog. */
    trending: Game[] | undefined;
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

/** Nothing on the go and nothing to suggest: the one thing to do next. */
const StartSomething = ({
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

/** A game the card suggests, from the backlog or the catalogue. */
type Suggested = Pick<Game, "id" | "title" | "coverUrl" | "artworkUrl"> & {
    hype?: number | null;
};

/** How many the card offers: four, of which a phone shows three. */
const PICKS = 4;

const QUIET_LINK =
    "relative font-medium text-content-secondary before:absolute before:-inset-x-1 before:-inset-y-3 before:content-[''] hover:text-content";

/** The cover, darkened, under "Start playing": the art itself dims, as a
 *  veil over it would show a light rim round its rounded corners. */
const DIMMED = "brightness-[0.35]";

/**
 * One game to start: its cover, which starts it, and its hype. A mouse
 * starts it in one click, with what a click does shown on hover; a finger
 * has no hover, so its first tap shows the same and the second starts it.
 */
const PickTile = ({
    game,
    flames,
    busy,
    starting,
    armed,
    onLight,
    onArm,
    onStart,
    className,
}: {
    game: Suggested;
    flames: boolean;
    busy: boolean;
    starting: boolean;
    armed: boolean;
    onLight: () => void;
    onArm: (on: boolean) => void;
    onStart: () => void;
    className?: string;
}) => {
    const touch = useRef(false);
    const tile = useRef<HTMLLIElement>(null);
    // A tap anywhere else puts it back, as a phone has no pointer leaving.
    useDismiss([tile], () => onArm(false), { enabled: armed });
    const shown = armed || starting;
    return (
        <li
            ref={tile}
            onMouseEnter={onLight}
            onFocus={onLight}
            className={cn("flex min-w-0 flex-col sm:w-20", className)}
        >
            <button
                type="button"
                aria-label={`Start playing ${game.title}`}
                title={game.title}
                disabled={busy}
                onPointerDown={(event) => {
                    touch.current = event.pointerType === "touch";
                }}
                onClick={() => {
                    if (touch.current && !armed) onArm(true);
                    else onStart();
                }}
                onBlur={() => onArm(false)}
                className="group/cover relative block w-full cursor-pointer overflow-hidden rounded-sm shadow-cover lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-default"
            >
                <GameCover
                    coverUrl={game.coverUrl}
                    title={game.title}
                    className={cn(
                        "aspect-3/4 w-full transition-[filter] duration-200",
                        "group-hover/cover:brightness-[0.35] group-focus-visible/cover:brightness-[0.35]",
                        shown && DIMMED
                    )}
                />
                <span
                    aria-hidden
                    className={cn(
                        "absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-1 text-center text-content-on-media opacity-0 transition-opacity duration-200",
                        "group-hover/cover:opacity-100 group-focus-visible/cover:opacity-100",
                        shown && "opacity-100"
                    )}
                >
                    {starting ? (
                        <LoadingSpinner size="sm" label={null} />
                    ) : (
                        <PlayGlyph
                            size={22}
                            className="drop-shadow-[0_2px_6px_rgb(0_0_0/0.5)]"
                        />
                    )}
                    <span className="text-[11px] leading-tight font-semibold [text-shadow:0_1px_4px_rgb(0_0_0/0.6)]">
                        {starting ? "Starting…" : "Start playing"}
                    </span>
                </span>
            </button>
            {/* Kept with none while any beside it has one, so the covers
                stay in a row. */}
            {flames && (
                <span className="mt-2 flex h-3.5 items-center">
                    {game.hype ? <HypeFlames hype={game.hype} /> : null}
                </span>
            )}
        </li>
    );
};

/** Nothing on the go, with games to start: the art of the one you're
 *  looking at behind them, as Now playing has its own. */
const StartPicks = ({
    games,
    title,
    note,
    links,
    onStart,
}: {
    games: Suggested[];
    title: string;
    note: string;
    links: ReactNode;
    /** Starts it, and gives back how to put it back as it was. */
    onStart: (game: Suggested) => Promise<() => Promise<unknown>>;
}) => {
    const notify = useNotify();
    const touch = useMediaQuery("(pointer: coarse)");
    const [litId, setLitId] = useState<number | null>(null);
    const [startingId, setStartingId] = useState<number | null>(null);
    const [armedId, setArmedId] = useState<number | null>(null);
    const lit = games.find((g) => g.id === litId) ?? games[0]!;

    // Fetched now, so the first look at each doesn't wait on its art.
    const arts = games.map((g) => g.artworkUrl).join(" ");
    useEffect(() => {
        for (const url of arts.split(" ").filter(Boolean))
            new Image().src = igdbSized(url, "screenshot_big");
    }, [arts]);

    const start = async (game: Suggested) => {
        setStartingId(game.id);
        try {
            const undo = await onStart(game);
            // Left disabled: the card becomes Now playing as the shelf
            // comes back. One click starts it, so one click takes it back.
            notify(`Started ${game.title}`, "success", undefined, {
                label: "Undo",
                dwell: OFFER_DWELL_MS,
                onClick: () =>
                    void undo().catch(() =>
                        notify(
                            "Couldn’t undo that. Try from the game’s page.",
                            "error"
                        )
                    ),
            });
        } catch {
            setStartingId(null);
            notify("Couldn’t start that one. Try again.", "error");
        }
    };

    return (
        <section
            aria-labelledby="now-playing"
            className={cardClass("relative isolate overflow-hidden", {
                padding: "none",
            })}
        >
            <ArtBackdrop url={lit.artworkUrl} />
            <div className="relative flex animate-fade-up flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-8 sm:p-5">
                <div className="flex min-w-0 flex-1 flex-col">
                    <h2
                        id="now-playing"
                        className="text-label-sm text-content-muted"
                    >
                        Nothing on the go
                    </h2>
                    <p className="mt-0.5 font-display text-lg leading-tight text-content sm:text-2xl">
                        {title}
                    </p>
                    <p className="mt-1 text-label text-content-secondary sm:mt-1.5 sm:text-body-sm">
                        {note}
                        {/* No hover to show what a cover does. */}
                        {touch && " Tap one to start it."}
                    </p>
                    <p className="mt-2.5 flex flex-wrap gap-x-5 gap-y-2 text-label sm:mt-3">
                        {links}
                    </p>
                </div>
                <ul className="grid grid-cols-3 gap-3 sm:flex sm:shrink-0 sm:gap-3">
                    {games.map((game, i) => (
                        <PickTile
                            key={game.id}
                            game={game}
                            flames={games.some((g) => g.hype)}
                            busy={startingId !== null}
                            starting={startingId === game.id}
                            armed={armedId === game.id}
                            onLight={() => setLitId(game.id)}
                            onArm={(on) =>
                                setArmedId((id) =>
                                    on ? game.id : id === game.id ? null : id
                                )
                            }
                            onStart={() => void start(game)}
                            // Three to a phone, so each is big enough to
                            // tap and to know.
                            className={i === 3 ? "max-sm:hidden" : undefined}
                        />
                    ))}
                </ul>
            </div>
        </section>
    );
};

/** The backlog's most wanted, each moved to Playing in one tap. */
const BacklogPicks = ({
    username,
    backlog,
}: {
    username: string;
    backlog: number;
}) => {
    const { data, isPending } = useMyShelf("backlog", {
        limit: PICKS,
        sort: "hype",
    });
    const { patch } = useLogMutations();
    const logs = (data?.data ?? []).flatMap((entry) => {
        const log = logOnShelf(entry, "backlog");
        return log?.game ? [{ log, game: log.game }] : [];
    });

    if (isPending) return <NowPlayingSkeleton />;
    if (logs.length === 0)
        return <StartSomething username={username} backlog={backlog} />;

    const hyped = logs.some(({ log }) => log.hype);
    return (
        <StartPicks
            games={logs.map(({ log, game }) => ({ ...game, hype: log.hype }))}
            title="Pick one up from your backlog"
            note={`${waiting(backlog)} waiting${hyped ? ", the ones you want most first" : ""}.`}
            onStart={async (game) => {
                const { log } = logs.find((l) => l.game.id === game.id)!;
                await patch.mutateAsync({
                    logId: log.id,
                    input: {
                        status: "playing",
                        startDate: log.startDate ?? todayIsoDate(),
                    },
                });
                // Back on the backlog as it was, its hype with it.
                return () =>
                    patch.mutateAsync({
                        logId: log.id,
                        input: {
                            status: "backlog",
                            startDate: log.startDate,
                            hype: log.hype ?? null,
                        },
                    });
            }}
            links={
                <>
                    <Link
                        to={shelfPath(username, "backlog")}
                        className={QUIET_LINK}
                    >
                        See all {formatCount(backlog)}
                    </Link>
                    <Link to="/library" className={QUIET_LINK}>
                        Browse the library
                    </Link>
                </>
            }
        />
    );
};

/** No backlog either: this week's most talked-about games that aren't on
 *  a shelf of yours yet. */
const TrendingPicks = ({
    username,
    trending,
}: {
    username: string;
    trending: Suggested[] | undefined;
}) => {
    const { data: mine } = useMyGameLogIds();
    const { create, remove } = useLogMutations();
    if (!trending || !mine) return <NowPlayingSkeleton />;

    const logged = new Set(mine.map((log) => log.gameId));
    const games = trending.filter((g) => !logged.has(g.id)).slice(0, PICKS);
    if (games.length === 0)
        return <StartSomething username={username} backlog={0} />;

    return (
        <StartPicks
            games={games}
            title="Start something new"
            note="Nothing on your backlog either, so here’s what’s trending this week."
            onStart={async (game) => {
                const log = await create.mutateAsync({
                    gameId: game.id,
                    status: "playing",
                    startDate: todayIsoDate(),
                });
                return () => remove.mutateAsync(log.id);
            }}
            links={
                <Link to="/library" className={QUIET_LINK}>
                    Browse the library
                </Link>
            }
        />
    );
};

/** Nothing on the go: games to start, with their art, at every width. */
const NothingOnTheGo = ({
    username,
    backlog,
    trending,
}: {
    username: string;
    backlog: number;
    trending: Suggested[] | undefined;
}) =>
    backlog > 0 ? (
        <BacklogPicks username={username} backlog={backlog} />
    ) : (
        <TrendingPicks username={username} trending={trending} />
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
    trending,
    onUpdateLog,
}: {
    playing: GameLogWithGame[] | undefined;
    username: string;
    shelves: Record<string, number> | undefined;
    trending: Suggested[] | undefined;
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
                trending={trending}
            />
        );
    }

    const game = open.game;
    const PlatformIcon = playedOn.Icon;
    const onTheGo = Math.max(shelves?.playing ?? 0, playing.length);

    return (
        <section
            aria-labelledby="now-playing"
            className={cardClass("relative isolate overflow-hidden", {
                padding: "none",
            })}
        >
            {/* The game's own art, fading out before the words: enough to
                say which world you're in, never in the way. */}
            <ArtBackdrop url={game.artworkUrl} />
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
    trending,
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
            trending={trending}
            onUpdateLog={onUpdateLog}
        />
        <Shelves username={username} shelves={shelves} />
    </section>
);

export default ReEntryPlate;

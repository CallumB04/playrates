import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Gamepad2, Pencil, Plus } from "lucide-react";
import type { Game, GameStatus, UserStats } from "@playrates/shared";
import type { GameLogWithGame } from "../../../api";
import Button from "../../../components/ui/Button";
import GameCover from "../../../components/game/GameCover";
import RatingBadge from "../../../components/ui/RatingBadge";
import YearChart from "./YearChart";
import {
    GAME_STATUSES,
    STATUS_PRESENTATION,
} from "../../../constants/gameStatus";
import { formatCount, formatHours, relativeTime } from "../../../lib/format";
import { cn } from "../../../lib/cn";

const STARTERS = 6;

type QuickShelf = "backlog" | "wishlist";

/** What a starter already on a shelf says in place of its buttons. */
const ON_SHELF: Record<GameStatus, string> = {
    played: "Played",
    playing: "Playing",
    backlog: "In your backlog",
    wishlist: "On your wishlist",
};

interface ReEntryPlateProps {
    username: string;
    /** First name where they have set one, username otherwise. */
    displayName: string;
    /** Nothing logged yet: offer games to start their shelves with. */
    isNew: boolean;
    /** The most recently touched "playing" log, if there is one. */
    current: GameLogWithGame | undefined;
    /** How many games on each shelf, all time. */
    shelves: Record<string, number> | undefined;
    /** This year's played logs, for the chart. */
    yearLogs: GameLogWithGame[];
    yearStats: UserStats | undefined;
    /** Well-known games for a newcomer to start with. */
    starters: Game[];
    /** Which shelf a game is on already, if any. */
    shelfOf: (gameId: number) => GameStatus | null;
    onAddStarter: (game: Game, shelf: QuickShelf) => Promise<unknown>;
    onUpdateLog: () => void;
}

const EYEBROW = "text-label-sm font-medium tracking-[0.14em] uppercase";

const today = () =>
    new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
    }).format(new Date());

const NowPlaying = ({
    current,
    username,
    shelves,
    onUpdateLog,
}: {
    current: GameLogWithGame | undefined;
    username: string;
    shelves: Record<string, number> | undefined;
    onUpdateLog: () => void;
}) => {
    const game = current?.game;
    const others = Math.max(0, (shelves?.playing ?? 0) - 1);
    const backlog = shelves?.backlog ?? 0;

    if (!current || !game) {
        return (
            <div className="flex items-center gap-4 p-4 sm:gap-5 sm:p-5">
                <span className="grid aspect-3/4 w-16 shrink-0 place-items-center rounded-sm border border-dashed border-strong text-content-muted sm:w-20">
                    <Gamepad2 size={22} aria-hidden />
                </span>
                <div className="min-w-0">
                    <p className={cn(EYEBROW, "text-content-muted")}>
                        Now playing
                    </p>
                    <p className="mt-1.5 font-display text-lg text-content sm:text-xl">
                        Nothing on the go
                    </p>
                    <Link
                        to={
                            backlog > 0
                                ? `/user/${username}?type=backlog`
                                : "/library"
                        }
                        className="relative mt-1 inline-flex items-center gap-1 text-label text-brand before:absolute before:-inset-2.5 before:content-[''] hover:underline sm:before:hidden"
                    >
                        {backlog > 0
                            ? `${formatCount(backlog)} ${backlog === 1 ? "game" : "games"} waiting in your backlog`
                            : "Find something to play in the library"}
                        <ArrowRight size={13} aria-hidden />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-4 p-4 sm:gap-5 sm:p-5">
            <Link to={`/game/${game.id}`} className="shrink-0 lift">
                <GameCover
                    coverUrl={game.coverUrl}
                    title={game.title}
                    className="aspect-3/4 w-16 overflow-hidden rounded-sm shadow-cover sm:w-20 lg:w-24"
                />
            </Link>
            <div className="min-w-0 flex-1">
                <p
                    className={cn(
                        EYEBROW,
                        STATUS_PRESENTATION.playing.markTone
                    )}
                >
                    Now playing
                </p>
                <Link
                    to={`/game/${game.id}`}
                    className="mt-1.5 line-clamp-2 font-display text-lg leading-snug text-content hover:text-brand sm:text-xl lg:text-2xl"
                >
                    {game.title}
                </Link>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-label-sm text-content-muted">
                    {current.hoursPlayed !== null && (
                        <span className="font-mono">
                            {formatHours(current.hoursPlayed)}
                        </span>
                    )}
                    <span>Updated {relativeTime(current.updatedAt)}</span>
                    {current.rating !== null && (
                        <RatingBadge value={current.rating} />
                    )}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={onUpdateLog}
                        className="max-sm:min-h-11"
                    >
                        <Pencil size={13} aria-hidden />
                        Update
                    </Button>
                    {others > 0 && (
                        <Link
                            to={`/user/${username}?type=playing`}
                            className="text-label text-content-secondary hover:text-content"
                        >
                            +{formatCount(others)} more on the go
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
};

/** The four shelves, each a figure that opens the shelf on your profile. */
const Shelves = ({
    username,
    shelves,
}: {
    username: string;
    shelves: Record<string, number> | undefined;
}) => (
    <nav
        aria-label="Your shelves"
        className="grid h-full grid-cols-4 divide-x divide-subtle"
    >
        {GAME_STATUSES.map((status) => {
            const { label, icon: Icon, markTone } = STATUS_PRESENTATION[status];
            return (
                <Link
                    key={status}
                    to={`/user/${username}?type=${status}`}
                    className="group flex min-h-11 flex-col items-center justify-center gap-1 px-1 py-3 transition-colors hover:bg-surface-hover/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand lg:items-start lg:justify-between lg:gap-4 lg:px-5 lg:py-5"
                >
                    <span className="flex items-center gap-1.5 text-label-sm text-content-muted group-hover:text-content-secondary lg:text-label">
                        <Icon
                            size={14}
                            aria-hidden
                            className={cn("shrink-0", markTone)}
                        />
                        {label}
                    </span>
                    <span className="font-mono text-lg leading-none font-medium text-content sm:text-xl lg:text-[32px]">
                        {formatCount(shelves?.[status] ?? 0)}
                    </span>
                </Link>
            );
        })}
    </nav>
);

const ShelfButton = ({
    shelf,
    title,
    onClick,
    disabled,
}: {
    shelf: QuickShelf;
    title: string;
    onClick: () => void;
    disabled: boolean;
}) => {
    const { label, markTone } = STATUS_PRESENTATION[shelf];
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={`Add ${title} to your ${label.toLowerCase()}`}
            className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-1 rounded-sm border border-subtle bg-surface-raised px-1 text-label-sm text-content transition-colors hover:border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-default disabled:opacity-60 sm:min-h-8"
        >
            <Plus size={12} aria-hidden className={cn("shrink-0", markTone)} />
            {label}
        </button>
    );
};

const Starters = ({
    games,
    shelfOf,
    onAdd,
}: {
    games: Game[];
    shelfOf: (gameId: number) => GameStatus | null;
    onAdd: (game: Game, shelf: QuickShelf) => Promise<unknown>;
}) => {
    const [adding, setAdding] = useState<number | null>(null);

    const add = async (game: Game, shelf: QuickShelf) => {
        setAdding(game.id);
        try {
            await onAdd(game, shelf);
        } catch {
            // the quick add has already said it failed
        } finally {
            setAdding(null);
        }
    };

    return (
        <section aria-labelledby="starters-heading">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
                <div>
                    <h2
                        id="starters-heading"
                        className="font-display text-section text-content"
                    >
                        Start your shelves
                    </h2>
                    <p className="mt-1 text-body-sm text-content-secondary">
                        Add a few you’ve played or want to.
                    </p>
                </div>
                <Link
                    to="/library"
                    className="inline-flex min-h-11 items-center gap-1 text-label text-brand hover:underline sm:min-h-0"
                >
                    Browse the library
                    <ArrowRight size={13} aria-hidden />
                </Link>
            </div>

            {/* A row that scrolls on a phone, where six covers side by side
                would be too small to tell apart. */}
            <ul className="-mx-5 flex snap-x snap-mandatory [scrollbar-width:none] gap-3 overflow-x-auto px-5 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 md:grid-cols-6 [&::-webkit-scrollbar]:hidden">
                {games.slice(0, STARTERS).map((game) => {
                    const shelf = shelfOf(game.id);
                    return (
                        <li
                            key={game.id}
                            className="w-[42%] shrink-0 snap-start sm:w-auto"
                        >
                            <Link
                                to={`/game/${game.id}`}
                                className="block lift"
                            >
                                <GameCover
                                    coverUrl={game.coverUrl}
                                    title={game.title}
                                    className="aspect-3/4 w-full overflow-hidden rounded-sm shadow-cover"
                                />
                            </Link>
                            {shelf ? (
                                <p className="mt-2 flex min-h-11 items-center justify-center gap-1 text-label-sm text-success sm:min-h-8">
                                    <Check size={13} aria-hidden />
                                    {ON_SHELF[shelf]}
                                </p>
                            ) : (
                                <div className="mt-2 flex gap-1.5">
                                    {(["backlog", "wishlist"] as const).map(
                                        (option) => (
                                            <ShelfButton
                                                key={option}
                                                shelf={option}
                                                title={game.title}
                                                disabled={adding === game.id}
                                                onClick={() =>
                                                    void add(game, option)
                                                }
                                            />
                                        )
                                    )}
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </section>
    );
};

/** This year in three figures and twelve bars, beside the greeting. */
const YearGlance = ({
    yearLogs,
    yearStats,
}: {
    yearLogs: GameLogWithGame[];
    yearStats: UserStats | undefined;
}) => (
    <div className="w-[320px]">
        <div className="mb-2.5 flex items-center justify-between gap-4">
            <span className={cn(EYEBROW, "text-content-muted")}>
                Your {new Date().getFullYear()}
            </span>
            <span className="flex items-center gap-3 text-label-sm text-content-secondary">
                <span>
                    <span className="font-mono text-content">
                        {formatCount(yearStats?.logCount ?? 0)}
                    </span>{" "}
                    logged
                </span>
                <span className="font-mono text-content">
                    {formatHours(yearStats?.hoursPlayed ?? 0)}
                </span>
                {yearStats?.averageRating != null && (
                    <RatingBadge value={yearStats.averageRating} />
                )}
            </span>
        </div>
        <YearChart logs={yearLogs} barsClassName="h-10" />
    </div>
);

/**
 * The signed-in landing: a greeting, then one panel with the game on the go
 * and the four shelves, laid straight on the page. A newcomer also gets
 * well-known games to start their shelves with.
 */
const ReEntryPlate = ({
    username,
    displayName,
    isNew,
    current,
    shelves,
    yearLogs,
    yearStats,
    starters,
    shelfOf,
    onAddStarter,
    onUpdateLog,
}: ReEntryPlateProps) => {
    const loggedThisYear = (yearStats?.logCount ?? 0) > 0;

    return (
        <section
            aria-labelledby="home-greeting"
            className="flex flex-col gap-6 lg:gap-8"
        >
            <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
                <div>
                    <p className={cn(EYEBROW, "text-content-muted")}>
                        {today()}
                    </p>
                    <h1
                        id="home-greeting"
                        className="mt-2 font-display text-[34px] leading-[1.05] text-content sm:text-[44px] lg:text-[52px]"
                    >
                        {isNew ? "Welcome" : "Welcome back"}, {displayName}
                    </h1>
                </div>
                {loggedThisYear && (
                    <div className="hidden lg:block">
                        <YearGlance yearLogs={yearLogs} yearStats={yearStats} />
                    </div>
                )}
            </div>

            <div className="overflow-hidden rounded-lg border border-subtle bg-surface-raised shadow-plate lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)] lg:divide-x lg:divide-subtle">
                <NowPlaying
                    current={current}
                    username={username}
                    shelves={shelves}
                    onUpdateLog={onUpdateLog}
                />
                <div className="border-t border-subtle lg:border-t-0">
                    <Shelves username={username} shelves={shelves} />
                </div>
            </div>

            {isNew && (
                <Starters
                    games={starters}
                    shelfOf={shelfOf}
                    onAdd={onAddStarter}
                />
            )}
        </section>
    );
};

export default ReEntryPlate;

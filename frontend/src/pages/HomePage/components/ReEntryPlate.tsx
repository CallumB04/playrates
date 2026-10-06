import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Gamepad2, Pencil, Plus } from "lucide-react";
import type { Game, UserStats } from "@playrates/shared";
import type { GameLogWithGame } from "../../../api";
import { cardClass } from "../../../components/ui/Card";
import { buttonClass } from "../../../components/ui/Button";
import { plateClass } from "../../../components/ui/Plate";
import Stat from "../../../components/ui/Stat";
import GameCover from "../../../components/game/GameCover";
import StatusBadge from "../../../components/ui/StatusBadge";
import RatingBadge from "../../../components/ui/RatingBadge";
import YearChart from "./YearChart";
import {
    GAME_STATUSES,
    STATUS_PRESENTATION,
} from "../../../constants/gameStatus";
import { formatCount, formatHours, relativeTime } from "../../../lib/format";
import { cn } from "../../../lib/cn";

const STARTERS = 4;

interface ReEntryPlateProps {
    username: string;
    /** First name where they have set one, username otherwise. */
    displayName: string;
    /** Nothing logged yet: offer games to start with instead of shelves. */
    isNew: boolean;
    /** Wide art to sit behind the plate. */
    backdrop: string | null;
    /** The most recently touched "playing" log, if there is one. */
    current: GameLogWithGame | undefined;
    /** How many games on each shelf, all time. */
    shelves: Record<string, number> | undefined;
    /** This year's logs, for the chart. */
    yearLogs: GameLogWithGame[];
    yearStats: UserStats | undefined;
    /** What a newcomer is offered to add: well-known games, not the
     *  trending row that sits right below. */
    starters: Game[];
    /** Games already logged, so an added starter shows as done. */
    isLogged: (gameId: number) => boolean;
    onAddStarter: (game: Game) => Promise<unknown>;
    onUpdateLog: () => void;
}

const CurrentGame = ({
    current,
    onUpdateLog,
}: {
    current: GameLogWithGame & { game: NonNullable<GameLogWithGame["game"]> };
    onUpdateLog: () => void;
}) => (
    <button
        type="button"
        onClick={onUpdateLog}
        className={plateClass(
            "pressed",
            "shallow",
            "flex w-full cursor-pointer items-center gap-3.5 p-3 text-left lift hover:border-strong"
        )}
    >
        <GameCover
            coverUrl={current.game.coverUrl}
            title={current.game.title}
            className="aspect-3/4 w-14 shrink-0 overflow-hidden rounded-xs shadow-cover"
        />
        <span className="min-w-0 flex-1">
            <StatusBadge status="playing" />
            <span className="mt-1.5 block truncate text-body-sm font-medium text-content">
                {current.game.title}
            </span>
            <span className="block text-label-sm text-content-muted">
                Updated {relativeTime(current.updatedAt)}
                {current.hoursPlayed !== null &&
                    ` · ${formatHours(current.hoursPlayed)}`}
            </span>
        </span>
        {current.rating !== null && <RatingBadge value={current.rating} />}
        <Pencil size={15} aria-hidden className="shrink-0 text-content-muted" />
    </button>
);

const NothingOnTheGo = ({
    username,
    backlogCount,
}: {
    username: string;
    backlogCount: number;
}) => (
    <Link
        to={backlogCount > 0 ? `/user/${username}?type=backlog` : "/library"}
        className={plateClass(
            "pressed",
            "shallow",
            "flex w-full items-center gap-3.5 border-dashed p-3 text-left lift hover:border-strong"
        )}
    >
        <span className="grid aspect-3/4 w-14 shrink-0 place-items-center rounded-xs border border-dashed border-strong bg-surface-sunken/60 text-content-muted">
            <Gamepad2 size={20} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
            <span className="block text-body-sm font-medium text-content">
                Nothing on the go
            </span>
            <span className="mt-1 block text-label-sm text-content-muted">
                {backlogCount > 0
                    ? `${formatCount(backlogCount)} ${backlogCount === 1 ? "game" : "games"} waiting in your backlog`
                    : "Find something to play in the library"}
            </span>
        </span>
        <ArrowRight
            size={15}
            aria-hidden
            className="shrink-0 text-content-muted"
        />
    </Link>
);

const Starters = ({
    games,
    isLogged,
    onAdd,
}: {
    games: Game[];
    isLogged: (gameId: number) => boolean;
    onAdd: (game: Game) => Promise<unknown>;
}) => {
    const [adding, setAdding] = useState<number | null>(null);

    const add = async (game: Game) => {
        setAdding(game.id);
        try {
            await onAdd(game);
        } catch {
            // the quick add has already said it failed
        } finally {
            setAdding(null);
        }
    };

    return (
        <div>
            <h2 className="mb-3 text-label text-content-secondary">
                Start your shelves
            </h2>
            <ul className="grid grid-cols-4 gap-2.5 sm:gap-3">
                {games.slice(0, STARTERS).map((game) => {
                    const added = isLogged(game.id);
                    return (
                        <li key={game.id} className="relative">
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
                            <button
                                type="button"
                                aria-label={
                                    added
                                        ? `${game.title} is in your backlog`
                                        : `Add ${game.title} to your backlog`
                                }
                                disabled={added || adding === game.id}
                                onClick={() => void add(game)}
                                className={cn(
                                    "absolute right-1.5 bottom-1.5 grid size-7 cursor-pointer place-items-center rounded-full shadow-e2 backdrop-blur-sm",
                                    "before:absolute before:-inset-2 before:content-['']",
                                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                                    added
                                        ? "cursor-default bg-success text-content-on-solid"
                                        : "bg-surface-raised/90 text-content hover:bg-surface-raised disabled:opacity-60"
                                )}
                            >
                                {added ? (
                                    <Check size={15} aria-hidden />
                                ) : (
                                    <Plus size={15} aria-hidden />
                                )}
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

/**
 * The signed-in landing: the game on the go over its own artwork, the
 * shelves a press away, and your year down the side on a wide screen. A
 * newcomer, with nothing to show, gets trending games to start from instead.
 */
const ReEntryPlate = ({
    username,
    displayName,
    isNew,
    backdrop,
    current,
    shelves,
    yearLogs,
    yearStats,
    starters,
    isLogged,
    onAddStarter,
    onUpdateLog,
}: ReEntryPlateProps) => {
    const playingCount = shelves?.playing ?? 0;
    const backlogCount = shelves?.backlog ?? 0;
    const loggedThisYear = (yearStats?.logCount ?? 0) > 0;

    return (
        <section
            className={cardClass("relative isolate overflow-hidden", {
                padding: "none",
            })}
        >
            {backdrop ? (
                <>
                    <img
                        src={backdrop}
                        alt=""
                        aria-hidden
                        className="absolute inset-0 -z-10 size-full object-cover"
                    />
                    {/* Keeps the words readable over any picture, in either
                        theme: solid where the text is, thinning towards the
                        art. */}
                    <span
                        aria-hidden
                        className="absolute inset-0 -z-10 bg-linear-to-t from-surface-raised from-30% via-surface-raised/75 to-surface-raised/20 lg:bg-linear-to-r lg:from-20% lg:via-surface-raised/70 lg:to-surface-raised/15"
                    />
                </>
            ) : (
                <span
                    aria-hidden
                    className="pointer-events-none absolute -top-32 -right-28 -z-10 size-80 rounded-full bg-brand/12 blur-3xl"
                />
            )}

            {/* Three blocks so a phone can read them in the order that
                matters, greeting, the game, then the shelves, while a wide
                screen keeps the game and the year down the right. */}
            <div className="grid gap-6 px-5 py-6 sm:px-6 sm:py-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:gap-x-12 lg:px-8 lg:py-9">
                <div className="lg:col-start-1 lg:row-start-1">
                    <h1 className="font-display text-[32px] leading-tight text-content sm:text-[40px]">
                        {isNew ? "Welcome" : "Welcome back"}, {displayName}
                    </h1>
                    {!isNew && (
                        <p className="mt-2 max-w-[46ch] text-body leading-relaxed text-content-secondary">
                            {formatCount(playingCount)}{" "}
                            {playingCount === 1 ? "game" : "games"} in progress,{" "}
                            {formatCount(backlogCount)} in your backlog.
                        </p>
                    )}
                </div>

                <div className="flex flex-col gap-5 lg:col-start-2 lg:row-span-2 lg:row-start-1">
                    {isNew ? (
                        <Starters
                            games={starters}
                            isLogged={isLogged}
                            onAdd={onAddStarter}
                        />
                    ) : current?.game ? (
                        <CurrentGame
                            current={{ ...current, game: current.game }}
                            onUpdateLog={onUpdateLog}
                        />
                    ) : (
                        <NothingOnTheGo
                            username={username}
                            backlogCount={backlogCount}
                        />
                    )}

                    {/* The chart is what made a phone long and empty, so it
                        waits for a wide screen and a year with something in
                        it. */}
                    {loggedThisYear && (
                        <div className="hidden lg:block">
                            <div className="mb-3 flex items-baseline justify-between gap-3">
                                <h2 className="text-label text-content-muted">
                                    Your {new Date().getFullYear()}
                                </h2>
                                <span className="font-mono text-label-sm text-content-muted">
                                    {formatCount(yearStats?.logCount ?? 0)}{" "}
                                    logged
                                </span>
                            </div>

                            <YearChart logs={yearLogs} />

                            {/* Equal columns, so three figures of different
                                lengths still line up. */}
                            <div className="mt-5 grid grid-cols-3 gap-4 border-t border-subtle pt-4">
                                <Stat
                                    label="Hours"
                                    value={formatHours(
                                        yearStats?.hoursPlayed ?? 0
                                    )}
                                />
                                <Stat
                                    label="Average rating"
                                    value={
                                        <RatingBadge
                                            value={
                                                yearStats?.averageRating ?? null
                                            }
                                            size="md"
                                        />
                                    }
                                />
                                <Stat
                                    label="Rated"
                                    value={formatCount(
                                        yearStats?.ratingCount ?? 0
                                    )}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-4 lg:col-start-1 lg:row-start-2 lg:self-end">
                    {!isNew && (
                        <nav
                            aria-label="Your shelves"
                            className="grid grid-cols-4 gap-2 sm:max-w-[460px]"
                        >
                            {GAME_STATUSES.map((status) => {
                                const {
                                    label,
                                    icon: Icon,
                                    markTone,
                                } = STATUS_PRESENTATION[status];
                                return (
                                    <Link
                                        key={status}
                                        to={`/user/${username}?type=${status}`}
                                        className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-md border border-subtle bg-surface-raised/70 px-1 py-2 backdrop-blur-sm transition-colors lift hover:border-strong"
                                    >
                                        <span className="flex items-center gap-1.5">
                                            <Icon
                                                size={14}
                                                aria-hidden
                                                className={cn(
                                                    "shrink-0",
                                                    markTone
                                                )}
                                            />
                                            <span className="font-mono text-body-sm font-medium text-content">
                                                {formatCount(
                                                    shelves?.[status] ?? 0
                                                )}
                                            </span>
                                        </span>
                                        <span className="text-label-sm text-content-muted">
                                            {label}
                                        </span>
                                    </Link>
                                );
                            })}
                        </nav>
                    )}
                    <Link
                        to="/library"
                        className={buttonClass(
                            "primary",
                            "w-full sm:w-auto sm:self-start",
                            "lg"
                        )}
                    >
                        Browse games
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default ReEntryPlate;

import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Gamepad2, Pencil, Plus } from "lucide-react";
import type { Game, UserStats } from "@playrates/shared";
import type { GameLogWithGame } from "../../../api";
import { cardClass } from "../../../components/ui/Card";
import { buttonClass } from "../../../components/ui/Button";
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

const ROW =
    "flex w-full items-center gap-3.5 p-3 text-left transition-colors hover:bg-surface-hover/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand";

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
        className={cn(ROW, "cursor-pointer")}
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
        className={ROW}
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

/** The game on the go and the four shelves, in one panel over the art. */
const Panel = ({
    username,
    current,
    shelves,
    onUpdateLog,
}: {
    username: string;
    current: GameLogWithGame | undefined;
    shelves: Record<string, number> | undefined;
    onUpdateLog: () => void;
}) => (
    <div className="overflow-hidden rounded-md border border-subtle bg-surface-raised/75 shadow-plate backdrop-blur-md">
        {current?.game ? (
            <CurrentGame
                current={{ ...current, game: current.game }}
                onUpdateLog={onUpdateLog}
            />
        ) : (
            <NothingOnTheGo
                username={username}
                backlogCount={shelves?.backlog ?? 0}
            />
        )}
        <nav
            aria-label="Your shelves"
            className="grid grid-cols-4 divide-x divide-subtle border-t border-subtle"
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
                        className="flex min-h-11 flex-col items-center justify-center gap-0.5 px-1 py-2.5 transition-colors hover:bg-surface-hover/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                    >
                        <span className="flex items-center gap-1.5">
                            <Icon
                                size={14}
                                aria-hidden
                                className={cn("shrink-0", markTone)}
                            />
                            <span className="font-mono text-body-sm font-medium text-content">
                                {formatCount(shelves?.[status] ?? 0)}
                            </span>
                        </span>
                        <span className="text-label-sm text-content-muted">
                            {label}
                        </span>
                    </Link>
                );
            })}
        </nav>
    </div>
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
                        <li key={game.id}>
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
                                        ? `${game.title} is on your shelves`
                                        : `Add ${game.title} to your backlog`
                                }
                                disabled={added || adding === game.id}
                                onClick={() => void add(game)}
                                className={cn(
                                    "mt-2 flex min-h-11 w-full cursor-pointer items-center justify-center gap-1 rounded-sm border text-label-sm font-medium transition-colors sm:min-h-8",
                                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                                    added
                                        ? "cursor-default border-transparent text-success"
                                        : "border-subtle bg-surface-raised/80 text-content backdrop-blur-sm hover:border-strong disabled:opacity-60"
                                )}
                            >
                                {added ? (
                                    <Check size={13} aria-hidden />
                                ) : (
                                    <Plus size={13} aria-hidden />
                                )}
                                {added ? "Added" : "Backlog"}
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

/**
 * The signed-in landing over game artwork: the game on the go and the
 * shelves a press away in one panel, and your year beside it on a wide
 * screen. A newcomer also gets well-known games to start their shelves.
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
                        className="absolute inset-0 -z-10 size-full scale-125 object-cover blur-2xl"
                    />
                    {/* Keeps the words readable over any picture, in either
                        theme: solid where the text is, thinning towards the
                        art. The blur above turns art that is mostly a logo
                        into colour rather than giant letters. */}
                    <span
                        aria-hidden
                        className="absolute inset-0 -z-10 bg-linear-to-t from-surface-raised from-30% via-surface-raised/75 to-surface-raised/20 lg:bg-linear-to-r lg:from-20% lg:via-surface-raised/70 lg:to-surface-raised/30"
                    />
                </>
            ) : (
                <span
                    aria-hidden
                    className="pointer-events-none absolute -top-32 -right-28 -z-10 size-80 rounded-full bg-brand/12 blur-3xl"
                />
            )}

            {/* Blocks in the order a phone reads them: greeting, the panel,
                a newcomer's starters, then Browse. A wide screen puts the
                panel alone on the right, over the art, and keeps everything
                else on the solid left. */}
            <div className="grid gap-6 px-5 py-6 sm:px-6 sm:py-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:grid-rows-[auto_auto_1fr] lg:gap-x-12 lg:px-8 lg:py-9">
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

                <div className="lg:col-start-2 lg:row-span-3 lg:row-start-1">
                    <Panel
                        username={username}
                        current={current}
                        shelves={shelves}
                        onUpdateLog={onUpdateLog}
                    />
                </div>

                {/* The chart is what made a phone long and empty, so it waits
                    for a wide screen and a year with something in it. */}
                {!isNew && loggedThisYear && (
                    <div className="hidden lg:col-start-1 lg:row-start-2 lg:block lg:max-w-[460px]">
                        <div className="mb-3 flex items-baseline justify-between gap-3">
                            <h2 className="text-label text-content-muted">
                                Your {new Date().getFullYear()}
                            </h2>
                            <span className="font-mono text-label-sm text-content-muted">
                                {formatCount(yearStats?.logCount ?? 0)} logged
                            </span>
                        </div>

                        <YearChart logs={yearLogs} />

                        {/* Equal columns, so three figures of different
                                lengths still line up. */}
                        <div className="mt-5 grid grid-cols-3 gap-4 border-t border-subtle pt-4">
                            <Stat
                                label="Hours"
                                value={formatHours(yearStats?.hoursPlayed ?? 0)}
                            />
                            <Stat
                                label="Average rating"
                                value={
                                    <RatingBadge
                                        value={yearStats?.averageRating ?? null}
                                        size="md"
                                    />
                                }
                            />
                            <Stat
                                label="Rated"
                                value={formatCount(yearStats?.ratingCount ?? 0)}
                            />
                        </div>
                    </div>
                )}

                {isNew && (
                    <div className="lg:col-start-1 lg:row-start-2 lg:max-w-[440px]">
                        <Starters
                            games={starters}
                            isLogged={isLogged}
                            onAdd={onAddStarter}
                        />
                    </div>
                )}

                <Link
                    to="/library"
                    className={buttonClass(
                        "primary",
                        "w-full sm:w-auto sm:justify-self-start lg:col-start-1 lg:row-start-3 lg:self-end",
                        "lg"
                    )}
                >
                    Browse games
                </Link>
            </div>
        </section>
    );
};

export default ReEntryPlate;

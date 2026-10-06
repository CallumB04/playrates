import { Link } from "react-router-dom";
import { ArrowRight, Gamepad2, Pencil } from "lucide-react";
import type { UserStats } from "@playrates/shared";
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

interface ReEntryPlateProps {
    username: string;
    /** First name where they have set one, username otherwise. */
    displayName: string;
    /** Nothing logged yet, so not "welcome back". */
    isNew: boolean;
    /** The most recently touched "playing" log, if there is one. */
    current: GameLogWithGame | undefined;
    /** How many games on each shelf, all time. */
    shelves: Record<string, number> | undefined;
    /** This year's played logs, for the chart. */
    yearLogs: GameLogWithGame[];
    yearStats: UserStats | undefined;
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
                    className="group flex min-h-11 flex-col items-center justify-center gap-1 px-1 py-3 transition-colors hover:bg-surface-hover/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand lg:items-start lg:justify-center lg:gap-2 lg:px-5 lg:py-5"
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
        <YearChart
            logs={yearLogs}
            barsClassName="h-10"
            emptyNote="Games you finish this year chart here"
        />
    </div>
);

/**
 * The signed-in landing: a greeting, then one panel with the game on the go
 * and the four shelves, laid straight on the page.
 */
const ReEntryPlate = ({
    username,
    displayName,
    isNew,
    current,
    shelves,
    yearLogs,
    yearStats,
    onUpdateLog,
}: ReEntryPlateProps) => {
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
                <div className="hidden lg:block">
                    <YearGlance yearLogs={yearLogs} yearStats={yearStats} />
                </div>
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
        </section>
    );
};

export default ReEntryPlate;

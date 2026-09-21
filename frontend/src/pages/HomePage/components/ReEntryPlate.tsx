import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Pencil } from "lucide-react";
import type { UserStats } from "@playrates/shared";
import type { GameLogWithGame } from "../../../api";
import { buttonClass } from "../../../components/ui/Button";
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

interface ReEntryPlateProps {
    username: string;
    /** First name where they have set one, username otherwise. */
    displayName: string;
    /** The most recently touched "playing" log, if there is one. */
    current: GameLogWithGame | undefined;
    /** This year's logs, for the chart. */
    yearLogs: GameLogWithGame[];
    playingCount: number;
    backlogCount: number;
    yearStats: UserStats | undefined;
    onUpdateLog: () => void;
}

/** The figure leads. The label says what it is; it does not compete. */
const Stat = ({ label, value }: { label: string; value: ReactNode }) => (
    <div className="min-w-0">
        <p className="truncate font-mono text-[26px] leading-none text-content">
            {value}
        </p>
        <p className="mt-1.5 truncate text-label-sm text-content-muted">
            {label}
        </p>
    </div>
);

/**
 * The signed-in landing: a headline, something to press, and your own year
 * down the right-hand side.
 */
const ReEntryPlate = ({
    username,
    displayName,
    current,
    yearLogs,
    playingCount,
    backlogCount,
    yearStats,
    onUpdateLog,
}: ReEntryPlateProps) => (
    <section className="relative overflow-hidden rounded-lg border border-subtle bg-surface-raised shadow-plate">
        <span
            aria-hidden
            className="pointer-events-none absolute -top-32 -right-28 size-80 rounded-full bg-brand/12 blur-3xl"
        />

        <div className="relative grid gap-8 px-6 py-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:gap-12 lg:px-8 lg:py-9">
            <div className="flex flex-col justify-between gap-6">
                <div>
                    <h1 className="font-display text-[34px] leading-tight text-content sm:text-[40px]">
                        Welcome back, {displayName}
                    </h1>

                    <p className="mt-2.5 max-w-[46ch] text-body leading-relaxed text-content-secondary">
                        {formatCount(playingCount)}{" "}
                        {playingCount === 1 ? "game" : "games"} in progress,{" "}
                        {formatCount(backlogCount)} in your backlog.
                    </p>

                    <div className="mt-6 flex flex-wrap items-center gap-3">
                        <Link
                            to="/library"
                            className={buttonClass("primary", undefined, "lg")}
                        >
                            Browse games
                        </Link>
                        <Link
                            to={`/user/${username}`}
                            className={buttonClass(
                                "secondary",
                                undefined,
                                "lg"
                            )}
                        >
                            Your profile
                        </Link>
                    </div>
                </div>

                {/* The shelves, one press away. */}
                <div className="flex flex-wrap gap-2 border-t border-subtle pt-5">
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
                                className="inline-flex items-center gap-2 rounded-full border border-subtle px-3.5 py-1.5 text-body-sm text-content-secondary lift hover:border-strong hover:text-content"
                            >
                                <Icon
                                    size={14}
                                    aria-hidden
                                    className={cn("shrink-0", markTone)}
                                />
                                {label}
                            </Link>
                        );
                    })}
                </div>
            </div>

            <div className="flex flex-col gap-5">
                {current?.game && (
                    <button
                        type="button"
                        onClick={onUpdateLog}
                        className="flex w-full cursor-pointer items-center gap-3.5 rounded-md border border-subtle bg-surface-sunken/40 p-3 text-left lift hover:border-strong"
                    >
                        <span className="relative shrink-0">
                            <GameCover
                                coverUrl={current.game.coverUrl}
                                title={current.game.title}
                                className="aspect-3/4 w-14 overflow-hidden rounded-xs shadow-cover"
                            />
                        </span>
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
                        {current.rating !== null && (
                            <RatingBadge value={current.rating} />
                        )}
                        <Pencil
                            size={15}
                            aria-hidden
                            className="shrink-0 text-content-muted"
                        />
                    </button>
                )}

                <div>
                    <div className="mb-3 flex items-baseline justify-between gap-3">
                        <h2 className="text-label text-content-muted">
                            Your {new Date().getFullYear()}
                        </h2>
                        <span className="font-mono text-label-sm text-content-muted">
                            {formatCount(yearStats?.logCount ?? 0)} logged
                        </span>
                    </div>

                    <YearChart logs={yearLogs} />

                    {/* Equal columns, so three figures of different lengths
                        still line up. */}
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
                                    className="text-[26px]"
                                />
                            }
                        />
                        <Stat
                            label="Rated"
                            value={formatCount(yearStats?.ratingCount ?? 0)}
                        />
                    </div>
                </div>
            </div>
        </div>
    </section>
);

export default ReEntryPlate;

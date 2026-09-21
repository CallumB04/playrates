import { Link } from "react-router-dom";
import type { UserStats } from "@playrates/shared";
import type { GameLogWithGame } from "../../../api";
import Button, { buttonClass } from "../../../components/ui/Button";
import GameCover from "../../../components/game/GameCover";
import StatusBadge from "../../../components/ui/StatusBadge";
import RatingBadge from "../../../components/ui/RatingBadge";
import YearChart from "./YearChart";
import {
    GAME_STATUSES,
    STATUS_PRESENTATION,
} from "../../../constants/gameStatus";
import {
    formatCount,
    formatHours,
    formatRating,
    relativeTime,
} from "../../../lib/format";
import { cn } from "../../../lib/cn";

interface ReEntryPlateProps {
    username: string;
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
const Stat = ({ label, value }: { label: string; value: string }) => (
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
 * The signed-in landing.
 *
 * Signed out, the page opens with a claim and real box art. Signed in it
 * opened with a greeting in a white box, which is a worse first screen for
 * the person who actually uses the place. This keeps that structure — a
 * headline, something to press, the shelves within reach — and gives the
 * right-hand side to your own year rather than to six covers you have
 * already seen.
 */
const ReEntryPlate = ({
    username,
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
            className="pointer-events-none absolute -right-28 -top-32 size-80 rounded-full bg-brand/12 blur-3xl"
        />

        <div className="relative grid gap-8 px-6 py-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:gap-12 lg:px-8 lg:py-9">
            <div className="flex flex-col">
                <h1 className="font-display text-[34px] leading-tight text-content sm:text-[40px]">
                    Welcome back, {username}
                </h1>

                <p className="mt-2.5 max-w-[46ch] text-body leading-relaxed text-content-secondary">
                    {formatCount(playingCount)}{" "}
                    {playingCount === 1 ? "game" : "games"} in progress,{" "}
                    {formatCount(backlogCount)} in your backlog.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                    {current ? (
                        <Button size="lg" onClick={onUpdateLog}>
                            Update your log
                        </Button>
                    ) : (
                        <Link
                            to="/library"
                            className={buttonClass(
                                "primary",
                                undefined,
                                "lg"
                            )}
                        >
                            Find something to play
                        </Link>
                    )}
                    <Link
                        to={`/user/${username}`}
                        className={buttonClass("secondary", undefined, "lg")}
                    >
                        Your profile
                    </Link>
                </div>

                {/* The shelves, one press away. */}
                <div className="mt-7 flex flex-wrap gap-2 border-t border-subtle pt-5">
                    {GAME_STATUSES.map((status) => {
                        const { label, icon: Icon, markTone } =
                            STATUS_PRESENTATION[status];
                        return (
                            <Link
                                key={status}
                                to={`/user/${username}?type=${status}`}
                                className="lift inline-flex items-center gap-2 rounded-full border border-subtle px-3.5 py-1.5 text-body-sm text-content-secondary hover:border-strong hover:text-content"
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
                    <Link
                        to={`/game/${current.gameId}`}
                        className="lift flex items-center gap-3.5 rounded-md border border-subtle bg-surface-sunken/40 p-3 hover:border-strong"
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
                            <RatingBadge value={current.rating} bare />
                        )}
                    </Link>
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
                            value={formatRating(
                                yearStats?.averageRating ?? null
                            )}
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

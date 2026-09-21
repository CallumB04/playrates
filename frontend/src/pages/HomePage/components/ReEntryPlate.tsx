import { Link } from "react-router-dom";
import { Clock, Gamepad2, Star, TrendingUp } from "lucide-react";
import type { UserStats } from "@playrates/shared";
import type { GameLogWithGame } from "../../../api";
import Button, { buttonClass } from "../../../components/ui/Button";
import GameCover from "../../../components/game/GameCover";
import StatusBadge from "../../../components/ui/StatusBadge";
import {
    GAME_STATUSES,
    STATUS_PRESENTATION,
} from "../../../constants/gameStatus";
import {
    formatCount,
    formatFraction,
    formatHours,
    formatRating,
    relativeTime,
} from "../../../lib/format";
import { cn } from "../../../lib/cn";

interface ReEntryPlateProps {
    username: string;
    /** The most recently touched "playing" log, if there is one. */
    current: GameLogWithGame | undefined;
    playingCount: number;
    backlogCount: number;
    yearStats: UserStats | undefined;
    onUpdateLog: () => void;
}

/** The sentence under the welcome, built only from figures that exist. */
const buildSummary = (
    current: GameLogWithGame | undefined,
    playing: number,
    backlog: number
): string => {
    const parts: string[] = [];

    if (current?.game) {
        const hours = current.hoursPlayed;
        if (hours !== null) {
            parts.push(
                `You're ${formatHours(hours)} into ${current.game.title}`
            );
        } else {
            parts.push(`You've got ${current.game.title} on the go`);
        }
        if (current.achievementsTotal) {
            parts.push(
                `with ${formatFraction(
                    current.achievementsCompleted,
                    current.achievementsTotal
                )} achievements`
            );
        }
    }

    parts.push(
        `${formatCount(playing)} on the go and ${formatCount(backlog)} waiting`
    );
    return `${parts.join(", ")}.`;
};

/** A figure with a face on it, rather than a row in a ledger. */
const Stat = ({
    icon: Icon,
    label,
    value,
    tone,
}: {
    icon: typeof Clock;
    label: string;
    value: string;
    tone: string;
}) => (
    <div className="rounded-md border border-subtle bg-surface-raised px-3.5 py-3">
        <span
            className={cn(
                "flex size-7 items-center justify-center rounded-full",
                tone
            )}
        >
            <Icon size={14} aria-hidden />
        </span>
        <p className="mt-2.5 font-mono text-figure-lg text-content">{value}</p>
        <p className="text-label-sm text-content-muted">{label}</p>
    </div>
);

/**
 * The signed-in welcome.
 *
 * This was two flat cards: a greeting, and a four-row ledger of this year's
 * figures with nothing to press. The shelf links are the point — the fastest
 * thing most people want from a home page is back into their own backlog.
 */
const ReEntryPlate = ({
    username,
    current,
    playingCount,
    backlogCount,
    yearStats,
    onUpdateLog,
}: ReEntryPlateProps) => (
    <div className="flex flex-col gap-5">
        <section className="relative overflow-hidden rounded-lg border border-subtle bg-surface-raised p-6 shadow-plate">
            {/* A wash of brand behind the greeting, so the first thing on the
                page is not a white rectangle. */}
            <span
                aria-hidden
                className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-brand/10 blur-3xl"
            />

            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
                {current?.game && (
                    <Link
                        to={`/game/${current.gameId}`}
                        className="lift relative w-28 shrink-0 self-start hover:-translate-y-1"
                    >
                        <GameCover
                            coverUrl={current.game.coverUrl}
                            title={current.game.title}
                            className="aspect-3/4 w-full overflow-hidden rounded-md shadow-lifted"
                        />
                        <StatusBadge
                            status="playing"
                            size="stamp"
                            onMedia
                            className="absolute right-1.5 top-1.5"
                        />
                    </Link>
                )}

                <div className="min-w-0 flex-1">
                    {current && (
                        <p className="text-label text-status-playing">
                            Still playing, last logged{" "}
                            {relativeTime(current.updatedAt)}
                        </p>
                    )}

                    <h1 className="mt-1.5 font-display text-[36px] leading-tight text-content">
                        Welcome back, {username}
                    </h1>

                    <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-content-secondary">
                        {buildSummary(current, playingCount, backlogCount)}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2.5">
                        {current ? (
                            <Button onClick={onUpdateLog}>
                                Update your log
                            </Button>
                        ) : (
                            <Link to="/library" className={buttonClass("primary")}>
                                Find something to play
                            </Link>
                        )}
                        <Link
                            to={`/user/${username}?type=backlog`}
                            className={buttonClass("secondary")}
                        >
                            Open your backlog
                        </Link>
                    </div>
                </div>
            </div>

            {/* Straight into a shelf. Four links that were previously only
                reachable by going to a profile and finding the tabs. */}
            <div className="relative mt-6 flex flex-wrap gap-2 border-t border-subtle pt-4">
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
        </section>

        <section>
            <h2 className="mb-3 font-display text-section text-content">
                This year so far
            </h2>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <Stat
                    icon={Gamepad2}
                    label="Games logged"
                    value={formatCount(yearStats?.logCount ?? 0)}
                    tone="bg-brand-subtle text-brand"
                />
                <Stat
                    icon={Clock}
                    label="Hours played"
                    value={formatHours(yearStats?.hoursPlayed ?? 0)}
                    tone="bg-status-playing-quiet text-status-playing"
                />
                <Stat
                    icon={Star}
                    label="Average rating"
                    value={formatRating(yearStats?.averageRating ?? null)}
                    tone="bg-status-wishlist-quiet text-status-wishlist"
                />
                <Stat
                    icon={TrendingUp}
                    label="Games rated"
                    value={formatCount(yearStats?.ratingCount ?? 0)}
                    tone="bg-status-backlog-quiet text-status-backlog"
                />
            </div>
        </section>
    </div>
);

export default ReEntryPlate;

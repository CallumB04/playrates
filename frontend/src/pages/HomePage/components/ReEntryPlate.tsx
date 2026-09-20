import { Link } from "react-router-dom";
import type { UserStats } from "@playrates/shared";
import type { GameLogWithGame } from "../../../api";
import Button, { buttonClass } from "../../../components/ui/Button";
import GameCover from "../../../components/game/GameCover";
import StatusBadge from "../../../components/ui/StatusBadge";
import LedgerRow, { LedgerList } from "../../../components/ui/LedgerRow";
import EmptyPlate from "../../../components/ui/EmptyPlate";
import {
    formatCount,
    formatFraction,
    formatHours,
    formatRating,
    relativeTime,
} from "../../../lib/format";

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
            parts.push(`You're ${formatHours(hours)} into ${current.game.title}`);
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

const ReEntryPlate = ({
    username,
    current,
    playingCount,
    backlogCount,
    yearStats,
    onUpdateLog,
}: ReEntryPlateProps) => (
    <div className="grid items-stretch gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="flex flex-col gap-5 border border-strong bg-surface-raised p-6 shadow-lip sm:flex-row sm:items-center sm:gap-6">
            {current?.game ? (
                <Link
                    to={`/game/${current.gameId}`}
                    className="relative w-28 shrink-0 self-start"
                >
                    <GameCover
                        coverUrl={current.game.coverUrl}
                        title={current.game.title}
                        className="aspect-3/4 w-full shadow-cover"
                    />
                    <StatusBadge
                        status="playing"
                        size="stamp"
                        onMedia
                        className="absolute right-1.5 top-1.5"
                    />
                </Link>
            ) : null}

            <div className="min-w-0 flex-1">
                {current ? (
                    <p className="text-label text-status-playing">
                        ▶ Still playing · last logged{" "}
                        {relativeTime(current.updatedAt)}
                    </p>
                ) : (
                    <p className="text-label text-content-muted">
                        Nothing on the go
                    </p>
                )}

                <h1 className="mt-2 font-display text-[36px] leading-tight text-content">
                    Welcome back, {username}
                </h1>

                <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-content-secondary">
                    {buildSummary(current, playingCount, backlogCount)}
                </p>

                <div className="mt-4 flex flex-wrap gap-2.5">
                    {current && (
                        <Button onClick={onUpdateLog}>Update your log</Button>
                    )}
                    <Link
                        to="/library"
                        className={buttonClass("secondary")}
                    >
                        {current ? "Pick from the backlog" : "Find a game"}
                    </Link>
                </div>
            </div>
        </section>

        <section className="border border-strong bg-surface-raised p-5 shadow-lip">
            <h2 className="mb-3 text-label text-content-muted">
                This year so far
            </h2>
            {yearStats ? (
                <LedgerList>
                    <LedgerRow
                        label="Games logged"
                        value={formatCount(yearStats.logCount)}
                    />
                    <LedgerRow
                        label="Hours played"
                        value={formatHours(yearStats.hoursPlayed)}
                    />
                    <LedgerRow
                        label="Average rating"
                        value={formatRating(yearStats.averageRating)}
                    />
                    <LedgerRow
                        label="Games rated"
                        value={formatCount(yearStats.ratingCount)}
                        rule={false}
                    />
                </LedgerList>
            ) : (
                <EmptyPlate
                    title="Nothing logged yet"
                    body="Log a game and this fills in."
                />
            )}
        </section>
    </div>
);

export default ReEntryPlate;

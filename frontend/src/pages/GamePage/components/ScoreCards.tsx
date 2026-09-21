import { Clock, Hourglass, Trophy } from "lucide-react";
import type { Game, GameStats } from "@playrates/shared";
import { formatHours, formatPercent } from "../../../lib/format";
import { cn } from "../../../lib/cn";

/**
 * Metacritic's own banding: green from 75, yellow from 50, red below. The
 * colours are the recognisable part of that score, so a card showing one
 * without them is just a number in a box.
 */
const metacriticTone = (score: number): string => {
    if (score >= 75) return "bg-[#66cc33] text-black";
    if (score >= 50) return "bg-[#ffcc33] text-black";
    return "bg-[#ff0000] text-white";
};

const Card = ({
    label,
    hint,
    children,
}: {
    label: string;
    hint?: string;
    children: React.ReactNode;
}) => (
    <div className="flex flex-col gap-2 rounded-md border border-subtle bg-surface-raised px-4 py-3.5">
        <div className="flex items-baseline justify-between gap-2">
            <span className="text-label text-content-muted">{label}</span>
            {hint && (
                <span className="text-label-sm text-content-muted">{hint}</span>
            )}
        </div>
        {children}
    </div>
);

/** A figure with nothing behind it yet. */
const EMPTY = "–";

const Figure = ({
    icon: Icon,
    value,
    caption,
}: {
    icon: typeof Clock;
    value: string;
    caption: string;
}) => (
    <div className="flex items-center gap-2.5">
        <Icon size={16} aria-hidden className="shrink-0 text-content-muted" />
        <div>
            <p className="font-mono text-figure-lg leading-none text-content">
                {value}
            </p>
            <p className="mt-1 text-label-sm text-content-muted">{caption}</p>
        </div>
    </div>
);

/**
 * What this game scored, and what playing it actually costs.
 *
 * Metacritic is somebody else's number and is labelled as theirs. Everything
 * beside it is PlayRates' own: the hours people logged, the time they took to
 * finish, and how many of them cleared every achievement. Those used to be
 * RAWG's community score and RAWG's average playtime, printed in the same
 * rows as this site's figures.
 */
const ScoreCards = ({
    game,
    stats,
}: {
    game: Game;
    stats: GameStats | undefined;
}) => {
    const logCount = stats?.logCount ?? 0;

    return (
        <section className="grid gap-3 sm:grid-cols-2">
            {game.metacritic !== null ? (
                <Card label="Metacritic" hint="Critic score">
                    <div className="flex items-center gap-3">
                        <span
                            className={cn(
                                "grid size-14 shrink-0 place-items-center rounded-sm font-mono text-2xl font-bold",
                                metacriticTone(game.metacritic)
                            )}
                        >
                            {game.metacritic}
                        </span>
                        <p className="text-body-sm text-content-secondary">
                            {game.metacritic >= 75
                                ? "Generally favourable"
                                : game.metacritic >= 50
                                  ? "Mixed or average"
                                  : "Generally unfavourable"}
                        </p>
                    </div>
                </Card>
            ) : (
                <Card label="Metacritic" hint="Critic score">
                    <div className="flex items-center gap-3">
                        <span className="grid size-14 shrink-0 place-items-center rounded-sm bg-surface-sunken font-mono text-2xl text-content-muted">
                            {EMPTY}
                        </span>
                        <p className="text-body-sm text-content-muted">
                            No critic score
                        </p>
                    </div>
                </Card>
            )}

            <Card
                label="On PlayRates"
                hint={`${logCount} ${logCount === 1 ? "log" : "logs"}`}
            >
                <div className="flex flex-wrap gap-x-7 gap-y-3">
                    <Figure
                        icon={Clock}
                        value={
                            stats?.avgHoursPlayed != null
                                ? formatHours(stats.avgHoursPlayed)
                                : EMPTY
                        }
                        caption="Average played"
                    />
                    <Figure
                        icon={Hourglass}
                        value={
                            stats?.avgHoursToBeat != null
                                ? formatHours(stats.avgHoursToBeat)
                                : EMPTY
                        }
                        caption="Average to beat"
                    />
                    <Figure
                        icon={Trophy}
                        value={
                            stats?.completionRate != null
                                ? formatPercent(stats.completionRate)
                                : EMPTY
                        }
                        caption="All achievements"
                    />
                </div>
            </Card>
        </section>
    );
};

export default ScoreCards;

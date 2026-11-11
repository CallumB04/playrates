import { Clock, Hourglass, Trophy } from "lucide-react";
import type { Game, GameStats } from "@playrates/shared";
import { formatHours, formatPercent } from "../../../lib/format";
import CriticScore from "../../../lib/criticScore";
import { criticVerdict } from "../../../lib/criticVerdict";
import { plateClass } from "../../../components/ui/plateClass";
import Stat from "../../../components/ui/Stat";
import AchievementRing from "../../../components/gamelog/AchievementRing";
import { completionTone } from "../../../lib/completionTone";

/** A flat plate titled with what it holds — these sit in a row, and a raised
 *  card each would make them compete with the page's real cards. */
const ScoreCard = ({
    label,
    hint,
    children,
}: {
    label: string;
    hint?: string;
    children: React.ReactNode;
}) => (
    <div className={plateClass("flat", "shallow", "flex flex-col px-4 py-3.5")}>
        <div className="mb-3 flex items-baseline justify-between gap-2">
            <span className="text-label text-content-muted">{label}</span>
            {hint && (
                <span className="text-label-sm text-content-muted">{hint}</span>
            )}
        </div>
        <div className="flex flex-1 items-center">{children}</div>
    </div>
);

/**
 * What this game scored, and what playing it costs. The critic score is
 * somebody else's number and is labelled as theirs; everything beside it is
 * ours.
 */
/** The figure in its band's colour, with the ring beside it. Nobody having
 *  recorded achievements is no figure at all, not nought per cent. */
const AverageCompletion = ({ value }: { value: number | null }) =>
    value === null ? (
        <span className="text-content-muted">–</span>
    ) : (
        <span className="inline-flex items-center gap-2">
            <span className={completionTone(value).text}>
                {formatPercent(value)}
            </span>
            <AchievementRing done={value} total={1} size={20} bare />
        </span>
    );

const ScoreCards = ({
    game,
    stats,
}: {
    game: Game;
    stats: GameStats | undefined;
}) => {
    const logCount = stats?.logCount;

    return (
        <section className="grid items-stretch gap-3 sm:grid-cols-2">
            {game.criticScore !== null ? (
                <ScoreCard
                    label="Critic score"
                    hint="From the critics, via IGDB"
                >
                    <div className="flex items-center gap-3">
                        <CriticScore score={game.criticScore} size="lg" />
                        <p className="text-body-sm text-content-secondary">
                            {criticVerdict(game.criticScore)}
                        </p>
                    </div>
                </ScoreCard>
            ) : (
                <ScoreCard
                    label="Critic score"
                    hint="From the critics, via IGDB"
                >
                    <div className="flex items-center gap-3">
                        <span className="grid size-14 shrink-0 place-items-center rounded-sm bg-surface-sunken font-mono text-2xl text-content-muted">
                            –
                        </span>
                        <p className="text-body-sm text-content-muted">
                            No critic score
                        </p>
                    </div>
                </ScoreCard>
            )}

            <ScoreCard
                label="On PlayRates"
                // People, not logs: one player can log it on several consoles.
                hint={
                    logCount === undefined
                        ? undefined
                        : `${logCount} ${logCount === 1 ? "player" : "players"}`
                }
            >
                <div className="grid w-full grid-cols-3 gap-3">
                    <Stat
                        icon={Clock}
                        value={formatHours(stats?.avgHoursPlayed ?? 0)}
                        loading={!stats}
                        label="Average played"
                    />
                    <Stat
                        icon={Hourglass}
                        value={formatHours(stats?.avgHoursToBeat ?? 0)}
                        loading={!stats}
                        label="Average to beat"
                    />
                    <Stat
                        icon={Trophy}
                        value={
                            <AverageCompletion
                                value={stats?.avgCompletion ?? null}
                            />
                        }
                        label="Average completion"
                        loading={!stats}
                    />
                </div>
            </ScoreCard>
        </section>
    );
};

export default ScoreCards;

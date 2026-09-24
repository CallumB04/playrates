import { Clock, Hourglass, Trophy } from "lucide-react";
import type { Game, GameStats } from "@playrates/shared";
import { formatHours, formatPercent } from "../../../lib/format";
import MetacriticScore from "../../../lib/metacritic";

const Card = ({
    label,
    hint,
    children,
}: {
    label: string;
    hint?: string;
    children: React.ReactNode;
}) => (
    <div className="flex flex-col rounded-md border border-subtle bg-surface-raised px-4 py-3.5">
        <div className="mb-3 flex items-baseline justify-between gap-2">
            <span className="text-label text-content-muted">{label}</span>
            {hint && (
                <span className="text-label-sm text-content-muted">{hint}</span>
            )}
        </div>
        <div className="flex flex-1 items-center">{children}</div>
    </div>
);

const Figure = ({
    icon: Icon,
    value,
    caption,
}: {
    icon: typeof Clock;
    value: string;
    caption: string;
}) => (
    <div className="min-w-0">
        <Icon size={14} aria-hidden className="text-content-muted" />
        <p className="mt-1.5 truncate font-mono text-figure-lg leading-none text-content">
            {value}
        </p>
        <p className="mt-1 truncate text-label-sm text-content-muted">
            {caption}
        </p>
    </div>
);

/**
 * What this game scored, and what playing it costs. Metacritic is somebody
 * else's number and is labelled as theirs; everything beside it is ours.
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
        <section className="grid items-stretch gap-3 sm:grid-cols-2">
            {game.metacritic !== null ? (
                <Card label="Metacritic" hint="Critic score">
                    <div className="flex items-center gap-3">
                        <MetacriticScore score={game.metacritic} size="lg" />
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
                            –
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
                <div className="grid w-full grid-cols-3 gap-3">
                    <Figure
                        icon={Clock}
                        value={formatHours(stats?.avgHoursPlayed ?? 0)}
                        caption="Average played"
                    />
                    <Figure
                        icon={Hourglass}
                        value={formatHours(stats?.avgHoursToBeat ?? 0)}
                        caption="Average to beat"
                    />
                    <Figure
                        icon={Trophy}
                        value={formatPercent(stats?.avgCompletion ?? 0)}
                        caption="Average completion"
                    />
                </div>
            </Card>
        </section>
    );
};

export default ScoreCards;

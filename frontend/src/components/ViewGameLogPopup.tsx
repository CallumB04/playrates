import { Star, Trophy } from "lucide-react";
import type { GameLogWithGame } from "../api";
import { displayStatusFor } from "../constants/gameStatus";
import { useGame, usePlatforms } from "../hooks/queries/useGames";
import { platformIcon } from "../lib/platformIcons";
import RatingBadge from "./ui/RatingBadge";
import { formatDate, formatHours } from "../lib/format";
import { cn } from "../lib/cn";
import Modal from "./ui/Modal";
import Button, { buttonClass } from "./ui/Button";
import StatusBadge from "./ui/StatusBadge";
import GameCover from "./game/GameCover";

export interface LogPopupAction {
    label: string;
    onSelect: () => void;
}

interface ViewGameLogPopupProps {
    /** Non-null: the parent does not render this until it has a log. */
    gamelog: GameLogWithGame;
    closePopup: () => void;
    /**
     * What the viewer can do about this log — edit their own, jump to their
     * own log of the same game, or start one. Omitted when signed out, which
     * leaves Close as the only control.
     */
    primaryAction?: LogPopupAction;
}

/** A ring, because a fraction is a shape before it is a number. */
const AchievementRing = ({
    done,
    total,
}: {
    done: number;
    total: number;
}) => {
    const pct = total > 0 ? Math.min(1, done / total) : 0;
    const radius = 34;
    const circumference = 2 * Math.PI * radius;

    return (
        <div className="relative grid size-24 place-items-center">
            <svg viewBox="0 0 80 80" className="size-full -rotate-90">
                <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="7"
                    className="text-surface-sunken"
                />
                <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - pct)}
                    className={cn(
                        "text-gold transition-[stroke-dashoffset] duration-700 ease-[var(--ease-glide)]",
                        pct === 1 && "text-brand"
                    )}
                />
            </svg>
            <span className="absolute text-center">
                <span className="block font-mono text-figure-lg text-content">
                    {Math.round(pct * 100)}%
                </span>
            </span>
        </div>
    );
};

const Detail = ({ label, value }: { label: string; value: string }) => (
    <div>
        <p className="text-label-sm text-content-muted">{label}</p>
        <p className="mt-0.5 font-mono text-body-sm text-content">{value}</p>
    </div>
);

/**
 * Somebody's log, opened.
 *
 * The rating and the achievements are the two things anyone came to see, so
 * they get the top of the popup at size rather than a pair of small figures
 * stacked against the right edge under a list of labelled rows.
 */
const ViewGameLogPopup: React.FC<ViewGameLogPopupProps> = ({
    gamelog,
    closePopup,
    primaryAction,
}) => {
    const { data: game } = useGame(gamelog.gameId);
    const { data: platforms } = usePlatforms();

    const status = displayStatusFor(gamelog.status, gamelog.playedStatus);
    const platform = (platforms ?? []).find((p) => p.slug === gamelog.platform);
    const PlatformIcon = platformIcon(gamelog.platform ?? "");

    const rating = gamelog.rating;
    const achievementsTotal = gamelog.achievementsTotal ?? 0;
    const achievementsDone = gamelog.achievementsCompleted ?? 0;

    const details = [
        gamelog.startDate && {
            label: "Started",
            value: formatDate(gamelog.startDate),
        },
        gamelog.finishDate && {
            label: "Finished",
            value: formatDate(gamelog.finishDate),
        },
        gamelog.hoursPlayed !== null && {
            label: "Hours played",
            value: formatHours(gamelog.hoursPlayed),
        },
        gamelog.hoursToBeat !== null && {
            label: "Hours to beat",
            value: formatHours(gamelog.hoursToBeat),
        },
    ].filter(Boolean) as { label: string; value: string }[];

    return (
        <Modal
            onClose={closePopup}
            labelledBy="view-log-title"
            className="w-full max-w-[560px] p-0! sm:p-0!"
        >
            <header className="flex items-center gap-4 border-b border-subtle px-5 py-4">
                <GameCover
                    coverUrl={game?.coverUrl ?? null}
                    title={game?.title ?? ""}
                    className="aspect-3/4 w-12 shrink-0 overflow-hidden rounded-xs shadow-cover"
                />
                <div className="min-w-0 flex-1">
                    <h2
                        id="view-log-title"
                        className="truncate font-display text-xl leading-tight text-content"
                    >
                        {game?.title ?? "…"}
                    </h2>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <StatusBadge status={status} />
                        {platform && (
                            <span className="inline-flex items-center gap-1.5 text-label-sm text-content-muted">
                                <PlatformIcon size={13} aria-hidden />
                                {platform.displayName}
                            </span>
                        )}
                    </div>
                </div>
            </header>

            {/* The two headline figures, at size. */}
            <div className="grid gap-3 px-5 py-5 sm:grid-cols-2">
                <div className="flex flex-col items-center justify-center gap-1 rounded-md border border-subtle bg-surface-sunken/50 px-4 py-5">
                    <span className="flex items-center gap-1.5 text-label text-content-muted">
                        <Star size={13} aria-hidden /> Rating
                    </span>
                    <span className="py-2">
                        <RatingBadge value={rating} size="lg" />
                    </span>
                </div>

                <div className="flex flex-col items-center justify-center gap-1.5 rounded-md border border-subtle bg-surface-sunken/50 px-4 py-5">
                    <span className="flex items-center gap-1.5 text-label text-content-muted">
                        <Trophy size={13} aria-hidden /> Achievements
                    </span>
                    {achievementsTotal > 0 ? (
                        <>
                            <AchievementRing
                                done={achievementsDone}
                                total={achievementsTotal}
                            />
                            <span className="font-mono text-label-sm text-content-secondary">
                                {achievementsDone} of {achievementsTotal}
                            </span>
                        </>
                    ) : (
                        <span className="py-9 text-body-sm text-content-muted">
                            None tracked
                        </span>
                    )}
                </div>
            </div>

            {details.length > 0 && (
                <div className="grid grid-cols-2 gap-4 border-t border-subtle px-5 py-4 sm:grid-cols-4">
                    {details.map((detail) => (
                        <Detail
                            key={detail.label}
                            label={detail.label}
                            value={detail.value}
                        />
                    ))}
                </div>
            )}

            <footer className="flex flex-wrap gap-3 border-t border-subtle bg-surface-raised px-5 py-4">
                {primaryAction && (
                    <Button
                        className="flex-1"
                        onClick={() => {
                            closePopup();
                            primaryAction.onSelect();
                        }}
                    >
                        {primaryAction.label}
                    </Button>
                )}
                <button
                    type="button"
                    className={buttonClass(
                        "secondary",
                        primaryAction ? "flex-1" : "w-full"
                    )}
                    onClick={closePopup}
                >
                    Close
                </button>
            </footer>
        </Modal>
    );
};

export default ViewGameLogPopup;

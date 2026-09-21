import type { ReactNode } from "react";
import type { GameLogWithGame } from "../api";
import { displayStatusFor } from "../constants/gameStatus";
import { useGame, usePlatforms } from "../hooks/queries/useGames";
import { useGameReviews } from "../hooks/queries/useReviews";
import { platformIcon } from "../lib/platformIcons";
import RatingBadge from "./ui/RatingBadge";
import LedgerRow, { LedgerList } from "./ui/LedgerRow";
import AchievementRing from "./gamelog/AchievementRing";
import { formatDate, formatHours } from "../lib/format";
import Modal from "./ui/Modal";
import Button, { buttonClass } from "./ui/Button";
import StatusBadge from "./ui/StatusBadge";

export interface LogPopupAction {
    label: string;
    onSelect: () => void;
}

interface ViewGameLogPopupProps {
    /** Non-null: the parent does not render this until it has a log. */
    gamelog: GameLogWithGame;
    /** Whose log this is, so their review can be picked out of the game's. */
    ownerUsername?: string;
    closePopup: () => void;
    /** Edit your own, jump to your own log of the same game, or start one.
     *  Omitted when signed out. */
    primaryAction?: LogPopupAction;
}

/** Somebody's log: the facts as a ledger, with the achievement ring beside them. */
const ViewGameLogPopup = ({
    gamelog,
    ownerUsername,
    closePopup,
    primaryAction,
}: ViewGameLogPopupProps) => {
    const { data: game } = useGame(gamelog.gameId);
    const { data: platforms } = usePlatforms();
    const { data: reviews } = useGameReviews(
        ownerUsername ? gamelog.gameId : undefined
    );

    const status = displayStatusFor(gamelog.status, gamelog.playedStatus);
    const platform = (platforms ?? []).find((p) => p.slug === gamelog.platform);
    const PlatformIcon = platformIcon(gamelog.platform ?? "");

    const review = (reviews?.data ?? []).find(
        (r) => r.author.username === ownerUsername
    );

    const achievementsTotal = gamelog.achievementsTotal ?? 0;
    const achievementsDone = gamelog.achievementsCompleted ?? 0;

    const facts = [
        { label: "Rating", value: <RatingBadge value={gamelog.rating} /> },
        gamelog.hoursPlayed !== null && {
            label: "Hours played",
            value: formatHours(gamelog.hoursPlayed),
        },
        gamelog.hoursToBeat !== null && {
            label: "Time to beat",
            value: formatHours(gamelog.hoursToBeat),
        },
        gamelog.startDate && {
            label: "Started",
            value: formatDate(gamelog.startDate),
        },
        gamelog.finishDate && {
            label: "Finished",
            value: formatDate(gamelog.finishDate),
        },
    ].filter(Boolean) as { label: string; value: ReactNode }[];

    return (
        <Modal
            onClose={closePopup}
            labelledBy="view-log-title"
            className="w-full max-w-[520px] p-0! sm:p-0!"
        >
            <header className="border-b border-subtle px-5 py-4 pr-12">
                <h2
                    id="view-log-title"
                    className="font-display text-section leading-tight text-content"
                >
                    {game?.title ?? "…"}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-label-sm text-content-muted">
                    <StatusBadge status={status} plain />
                    {platform && (
                        <span className="inline-flex items-center gap-1.5">
                            <PlatformIcon size={13} aria-hidden />
                            {platform.displayName}
                        </span>
                    )}
                </div>
            </header>

            <div className="flex flex-wrap items-center gap-6 px-5 py-5">
                {achievementsTotal > 0 && (
                    <div className="flex flex-col items-center gap-1.5">
                        <AchievementRing
                            done={achievementsDone}
                            total={achievementsTotal}
                        />
                        <span className="font-mono text-label-sm text-content-muted">
                            {achievementsDone} of {achievementsTotal}
                        </span>
                    </div>
                )}

                <LedgerList className="min-w-[210px] flex-1">
                    {facts.map((fact, i) => (
                        <LedgerRow
                            key={fact.label}
                            label={fact.label}
                            value={fact.value}
                            rule={i < facts.length - 1}
                        />
                    ))}
                </LedgerList>
            </div>

            {review && (
                <div className="border-t border-subtle px-5 py-4">
                    <h3 className="text-label text-content-muted">Review</h3>
                    <p className="mt-1.5 text-body-sm leading-relaxed whitespace-pre-line text-content-secondary">
                        {review.body}
                    </p>
                </div>
            )}

            <footer className="flex flex-wrap gap-3 border-t border-subtle px-5 py-4">
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

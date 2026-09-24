import type { ReactNode } from "react";
import type { GameLogWithGame } from "../api";
import { displayStatusFor } from "../constants/gameStatus";
import {
    useGame,
    usePlatforms,
    usePlatformSystems,
} from "../hooks/queries/useGames";
import { useGameReviews } from "../hooks/queries/useReviews";
import { platformIcon, systemIcon } from "../lib/platformIcons";
import RatingBadge from "./ui/RatingBadge";
import LedgerRow, { LedgerList } from "./ui/LedgerRow";
import AchievementRing from "./gamelog/AchievementRing";
import { formatDate, formatHours } from "../lib/format";
import { cn } from "../lib/cn";
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
    const { data: systems } = usePlatformSystems();
    const { data: reviews } = useGameReviews(
        ownerUsername ? gamelog.gameId : undefined
    );

    const status = displayStatusFor(gamelog.status, gamelog.playedStatus);
    // The machine where the log names one, its family where it doesn't —
    // logs made before systems existed only carry the family.
    const system = (systems ?? []).find((s) => s.slug === gamelog.system);
    const family = (platforms ?? []).find((p) => p.slug === gamelog.platform);
    const playedOn = system?.displayName ?? family?.displayName ?? null;
    const PlatformIcon = system
        ? systemIcon(system.slug, system.platformSlug)
        : platformIcon(gamelog.platform ?? "");

    const review = (reviews?.data ?? []).find(
        (r) => r.author.username === ownerUsername
    );

    const achievementsTotal = gamelog.achievementsTotal ?? 0;
    const achievementsDone = gamelog.achievementsCompleted ?? 0;

    /* Dates only. The rating, the completion and the hours carry the entry,
       so they are shown rather than listed. */
    const facts = [
        gamelog.startDate && {
            label: "Started",
            value: formatDate(gamelog.startDate),
        },
        gamelog.finishDate && {
            label: "Finished",
            value: formatDate(gamelog.finishDate),
        },
    ].filter(Boolean) as { label: string; value: ReactNode }[];

    const { hoursPlayed, hoursToBeat } = gamelog;
    const hasHours = hoursPlayed !== null || hoursToBeat !== null;
    /* Both bars share a scale, which is the whole point — "60 played against
       51 to beat" is a comparison, not two figures. */
    const longest = Math.max(hoursPlayed ?? 0, hoursToBeat ?? 0) || 1;

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
                    {playedOn && (
                        <span className="inline-flex items-center gap-1.5">
                            <PlatformIcon size={13} aria-hidden />
                            {playedOn}
                        </span>
                    )}
                </div>
            </header>

            <div className="px-5 py-5">
                {/* The two figures worth crossing the room for. */}
                <div className="flex items-stretch gap-5 rounded-md border border-subtle bg-surface-sunken/40 p-4">
                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-2.5">
                        <RatingBadge value={gamelog.rating} size="lg" />
                        <span className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
                            <span
                                className="block h-full rounded-full bg-brand transition-[width] duration-700 ease-[var(--ease-glide)]"
                                style={{
                                    width: `${((gamelog.rating ?? 0) / 10) * 100}%`,
                                }}
                            />
                        </span>
                        <span className="text-label-sm text-content-muted">
                            {gamelog.rating === null
                                ? "Not rated"
                                : "Your rating"}
                        </span>
                    </div>

                    {achievementsTotal > 0 && (
                        <div className="flex shrink-0 flex-col items-center gap-1.5 border-l border-subtle pl-5">
                            <AchievementRing
                                done={achievementsDone}
                                total={achievementsTotal}
                            />
                            <span className="font-mono text-label-sm text-content-muted">
                                {achievementsDone} of {achievementsTotal}
                            </span>
                        </div>
                    )}
                </div>

                {hasHours && (
                    <div className="mt-4 flex flex-col gap-2.5">
                        {(
                            [
                                ["Hours played", hoursPlayed, "bg-brand"],
                                ["Time to beat", hoursToBeat, "bg-strong"],
                            ] as const
                        )
                            .filter(([, hours]) => hours !== null)
                            .map(([label, hours, tone]) => (
                                <div
                                    key={label}
                                    className="flex items-center gap-3"
                                >
                                    <span className="w-24 shrink-0 text-body-sm text-content-secondary">
                                        {label}
                                    </span>
                                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                                        <span
                                            className={cn(
                                                "block h-full rounded-full",
                                                tone
                                            )}
                                            style={{
                                                width: `${((hours ?? 0) / longest) * 100}%`,
                                            }}
                                        />
                                    </span>
                                    <span className="w-14 shrink-0 text-right font-mono text-body-sm font-semibold text-content">
                                        {formatHours(hours)}
                                    </span>
                                </div>
                            ))}
                    </div>
                )}

                {facts.length > 0 && (
                    <LedgerList className="mt-4">
                        {facts.map((fact, i) => (
                            <LedgerRow
                                key={fact.label}
                                label={fact.label}
                                value={fact.value}
                                rule={i < facts.length - 1}
                            />
                        ))}
                    </LedgerList>
                )}
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

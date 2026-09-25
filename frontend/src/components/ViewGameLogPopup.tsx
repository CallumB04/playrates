import type { GameLogWithGame } from "../api";
import { displayStatusFor } from "../constants/gameStatus";
import { plateClass } from "./ui/Plate";
import Progress from "./ui/Progress";
import {
    useGame,
    usePlatforms,
    usePlatformSystems,
} from "../hooks/queries/useGames";
import { useGameReviews, useMyReview } from "../hooks/queries/useReviews";
import { useUser } from "../contexts/AuthContext";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { platformIcon, systemIcon } from "../lib/platformIcons";
import RatingBadge from "./ui/RatingBadge";
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
    const me = useUser();
    /* Whose figures these are. No owner named means it was opened from your
       own log, so it is yours. */
    const isMine = !ownerUsername || me?.username === ownerUsername;

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

    /* Your own comes from your own endpoint: the game's list is the public
       one, so a private review of yours is not in it. */
    const { data: myReview } = useMyReview(isMine ? gamelog.gameId : undefined);
    const theirReview = (reviews?.data ?? []).find(
        (r) => r.author.username === ownerUsername
    );
    const review = isMine ? myReview : theirReview;
    /* Only a public one has somewhere to lead — a private review is on no
       page but this one. */
    const fullReviewHref =
        review && review.isPublic
            ? `/game/${gamelog.gameId}#review-${review.id}`
            : null;

    const achievementsTotal = gamelog.achievementsTotal ?? 0;
    const achievementsDone = gamelog.achievementsCompleted ?? 0;

    const played = gamelog.startDate || gamelog.finishDate;

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
                {/* A meta line, not chips: the status carries its own hue and
                    mark, and a hairline is enough to part it from the machine
                    it was played on. */}
                <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-label-sm text-content-muted">
                    <StatusBadge status={status} plain />
                    {playedOn && (
                        <>
                            <span aria-hidden className="h-3 w-px bg-subtle" />
                            <span className="inline-flex items-center gap-1.5">
                                <PlatformIcon size={13} aria-hidden />
                                {playedOn}
                            </span>
                        </>
                    )}
                </div>
            </header>

            <div className="px-5 py-5">
                {/* The two figures worth crossing the room for. */}
                <div
                    className={plateClass(
                        "pressed",
                        "shallow",
                        "flex items-stretch gap-5 p-4"
                    )}
                >
                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-2.5">
                        <RatingBadge value={gamelog.rating} size="lg" />
                        <Progress
                            size="sm"
                            value={(gamelog.rating ?? 0) / 10}
                            label="Rating out of 10"
                            className="w-full"
                        />
                        <span className="text-label-sm text-content-muted">
                            {gamelog.rating === null
                                ? "Not rated"
                                : isMine
                                  ? "Your rating"
                                  : "Their rating"}
                        </span>
                    </div>

                    {achievementsTotal > 0 && (
                        <div className="flex shrink-0 flex-col items-center gap-1.5 border-l border-subtle pl-5">
                            <AchievementRing
                                done={achievementsDone}
                                total={achievementsTotal}
                            />
                            <span className="font-mono text-label-sm text-content-secondary">
                                {achievementsDone} of {achievementsTotal}
                            </span>
                            {/* The word the rest of the app uses for this —
                                the shelf sorts by "Completion" too. */}
                            <span className="text-label-sm text-content-muted">
                                Completion
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
                                    <Progress
                                        value={(hours ?? 0) / longest}
                                        label={label}
                                        fillClassName={tone}
                                        className="flex-1"
                                    />
                                    <span className="w-14 shrink-0 text-right font-mono text-body-sm font-semibold text-content">
                                        {formatHours(hours)}
                                    </span>
                                </div>
                            ))}
                    </div>
                )}

                {played && (
                    /* The two ends of a run, with the distance between them
                       drawn rather than described. An end that was never
                       recorded keeps its place rather than collapsing the
                       pair into one lopsided figure. */
                    <div
                        className={plateClass(
                            "pressed",
                            "shallow",
                            "mt-4 flex items-center gap-3 px-4 py-3"
                        )}
                    >
                        <div className="min-w-0 flex-1">
                            <p className="text-label-sm text-content-muted">
                                Started
                            </p>
                            <p className="mt-1 truncate font-mono text-body-sm font-medium text-content">
                                {formatDate(gamelog.startDate)}
                            </p>
                        </div>

                        <span
                            aria-hidden
                            className="flex shrink-0 items-center gap-1 text-content-muted"
                        >
                            <span className="h-px w-5 bg-strong sm:w-8" />
                            <ChevronRight size={13} />
                        </span>

                        <div className="min-w-0 flex-1 text-right">
                            <p className="text-label-sm text-content-muted">
                                Finished
                            </p>
                            <p className="mt-1 truncate font-mono text-body-sm font-medium text-content">
                                {formatDate(gamelog.finishDate)}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {review && (
                <div className="border-t border-subtle px-5 py-4">
                    <div className="flex items-baseline justify-between gap-3">
                        <h3 className="text-label text-content-muted">
                            Review
                        </h3>
                        {!review.isPublic && (
                            <span className="text-label-sm text-content-muted">
                                Private
                            </span>
                        )}
                    </div>

                    {/* A preview: the whole thing belongs on the game, where it
                        sits among the others. */}
                    <p className="mt-1.5 line-clamp-3 text-body-sm leading-relaxed whitespace-pre-line text-content-secondary">
                        {review.body}
                    </p>

                    {fullReviewHref && (
                        <Link
                            to={fullReviewHref}
                            onClick={closePopup}
                            className="mt-2 inline-flex items-center gap-1 text-label-sm text-accent lift hover:underline"
                        >
                            Read the full review
                            <ChevronRight size={13} aria-hidden />
                        </Link>
                    )}
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

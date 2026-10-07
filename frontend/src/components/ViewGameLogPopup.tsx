import { useState } from "react";
import type { LogWithReview } from "@playrates/shared";
import { displayStatusFor } from "../constants/gameStatus";
import { plateClass } from "./ui/Plate";
import Progress from "./ui/Progress";
import { useGame, usePlatformSystems } from "../hooks/queries/useGames";
import {
    useMyGameLogIds,
    useMyLogBundle,
    useUserLogBundle,
} from "../hooks/queries/useGameLogs";
import { useUser } from "../contexts/AuthContext";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import RatingBadge from "./ui/RatingBadge";
import AchievementRing from "./gamelog/AchievementRing";
import { formatDate, formatHours } from "../lib/format";
import Modal from "./ui/Modal";
import Button, { buttonClass } from "./ui/Button";
import SpoilerCover from "./ui/SpoilerCover";
import StatusBadge from "./ui/StatusBadge";
import { TextSkeleton } from "./ui/Skeleton";
import { cn } from "../lib/cn";
import { remainingSystems, systemsForGame } from "../lib/gameSystems";
import { useLogFlow } from "./gamelog/useLogFlow";
import { usePlayedOn } from "./gamelog/usePlayedOn";
import LogRow from "./gamelog/LogRow";
import RollupFigures from "./gamelog/RollupFigures";

interface LogPopupAction {
    label: string;
    onSelect: () => void;
}

interface ViewGameLogPopupProps {
    gameId: number;
    /** Whose logs these are. None named means your own. */
    ownerUsername?: string;
    /** Open on this console's log rather than the summary. */
    initialLogId?: number;
    onClose: () => void;
}

/** One console's log: the facts as a ledger, with the achievement ring
 *  beside them, and the review written about that run. */
const LogDetails = ({
    gamelog,
    isMine,
    onClose,
}: {
    gamelog: LogWithReview;
    isMine: boolean;
    onClose: () => void;
}) => {
    const review = gamelog.review;
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
        <>
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
                    <SpoilerCover
                        covered={review.containsSpoilers}
                        revealLabel="Show review"
                        className="mt-1.5"
                    >
                        <p className="mt-1.5 line-clamp-3 text-body-sm leading-relaxed whitespace-pre-line text-content-secondary">
                            {review.body}
                        </p>
                    </SpoilerCover>

                    {fullReviewHref && (
                        <Link
                            to={fullReviewHref}
                            onClick={onClose}
                            className="mt-2 inline-flex items-center gap-1 text-label-sm text-accent lift hover:underline"
                        >
                            Read the full review
                            <ChevronRight size={13} aria-hidden />
                        </Link>
                    )}
                </div>
            )}
        </>
    );
};

/** Somebody's logs of a game: one console's in full, or with several, a
 *  summary across them and a tab for each. */
const ViewGameLogPopup = ({
    gameId,
    ownerUsername,
    initialLogId,
    onClose,
}: ViewGameLogPopupProps) => {
    const me = useUser();
    const isMine = !ownerUsername || me?.username === ownerUsername;
    const flow = useLogFlow();
    const playedOn = usePlayedOn();

    const { data: game } = useGame(gameId);
    const { data: systems } = usePlatformSystems();
    const { data: myIds } = useMyGameLogIds();
    const mine = useMyLogBundle(gameId, isMine);
    const theirs = useUserLogBundle(ownerUsername, gameId, !isMine);
    const bundle = isMine ? mine.data : theirs.data;
    const logs = bundle?.logs ?? [];

    const [tab, setTab] = useState<number | "all">(initialLogId ?? "all");
    const selected =
        logs.length === 1
            ? logs[0]!
            : tab === "all"
              ? null
              : (logs.find((l) => l.id === tab) ?? null);
    const several = logs.length > 1;

    const free = remainingSystems(
        systemsForGame(systems ?? [], game?.systems ?? []),
        logs.map((l) => l.system)
    );

    /* Your own is editable, a game you've logged too opens yours, anything
       else you can start. */
    const action = ((): LogPopupAction | undefined => {
        if (!me) return undefined;
        if (!isMine) {
            return myIds?.some((s) => s.gameId === gameId)
                ? { label: "View my log", onSelect: () => flow.view(gameId) }
                : { label: "Add this game", onSelect: () => flow.open(gameId) };
        }
        if (selected) {
            const name = playedOn(selected).name;
            return {
                label: several && name ? `Edit ${name} log` : "Edit your log",
                onSelect: () => flow.edit(gameId, selected.id),
            };
        }
        return free.length > 0
            ? { label: "Add a platform", onSelect: () => flow.add(gameId) }
            : { label: "Edit your logs", onSelect: () => flow.open(gameId) };
    })();

    const meta = selected ? playedOn(selected) : null;
    const MetaIcon = meta?.Icon;

    return (
        <Modal
            onClose={onClose}
            labelledBy="view-log-title"
            className="w-full max-w-[560px] p-0! sm:p-0!"
        >
            <header className="border-b border-subtle px-5 pt-4 pr-12">
                <h2
                    id="view-log-title"
                    className="font-display text-section leading-tight text-content"
                >
                    {game?.title ?? "…"}
                </h2>
                {/* A meta line, not chips: the status carries its own hue and
                    mark, and a hairline is enough to part it from the machine
                    it was played on. */}
                {selected && !several && (
                    <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-label-sm text-content-muted">
                        <StatusBadge
                            status={displayStatusFor(
                                selected.status,
                                selected.playedStatus
                            )}
                            plain
                        />
                        {meta?.name && MetaIcon && (
                            <>
                                <span
                                    aria-hidden
                                    className="h-3 w-px bg-subtle"
                                />
                                <span className="inline-flex items-center gap-1.5">
                                    <MetaIcon size={13} aria-hidden />
                                    {meta.name}
                                </span>
                            </>
                        )}
                    </div>
                )}
                {several ? (
                    /* Scrolls inside itself on a phone rather than pushing
                       the page sideways. */
                    <div
                        role="tablist"
                        aria-label="Platforms"
                        className="-mx-5 mt-3 flex gap-1 overflow-x-auto px-5 pb-px"
                    >
                        {[null, ...logs].map((log) => {
                            const active = log ? tab === log.id : tab === "all";
                            const label = log
                                ? (playedOn(log).name ?? "No platform")
                                : "All";
                            return (
                                <button
                                    key={log?.id ?? "all"}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => setTab(log?.id ?? "all")}
                                    className={cn(
                                        "-mb-px flex min-h-11 shrink-0 cursor-pointer items-center border-b-2 px-3 text-label whitespace-nowrap lift",
                                        active
                                            ? "border-brand text-content"
                                            : "border-transparent text-content-muted hover:text-content"
                                    )}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="pb-4" />
                )}
            </header>

            {!bundle ? (
                <div className="px-5 py-5">
                    <TextSkeleton lines={4} />
                </div>
            ) : selected ? (
                <LogDetails
                    gamelog={selected}
                    isMine={isMine}
                    onClose={onClose}
                />
            ) : (
                <div className="px-5 py-5">
                    {bundle.rollup && (
                        <RollupFigures
                            rollup={bundle.rollup}
                            whose={isMine ? "Your" : "Their"}
                        />
                    )}
                    <div className="-mx-3 mt-5 flex flex-col border-t border-subtle pt-2">
                        {logs.map((log) => (
                            <LogRow
                                key={log.id}
                                log={log}
                                onSelect={() => setTab(log.id)}
                            />
                        ))}
                    </div>
                </div>
            )}

            <footer className="flex flex-wrap gap-3 border-t border-subtle px-5 py-4">
                {action && (
                    <Button className="flex-1" onClick={action.onSelect}>
                        {action.label}
                    </Button>
                )}
                <button
                    type="button"
                    className={buttonClass(
                        "secondary",
                        action ? "flex-1" : "w-full"
                    )}
                    onClick={onClose}
                >
                    Close
                </button>
            </footer>
        </Modal>
    );
};

export default ViewGameLogPopup;

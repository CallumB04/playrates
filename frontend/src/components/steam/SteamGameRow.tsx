import { ChevronDown } from "lucide-react";
import type { PlayedStatus, SteamLibraryItem } from "@playrates/shared";
import { STATUS_PRESENTATION } from "../../constants/gameStatus";
import { cn } from "../../lib/cn";
import { formatCount, formatPercent } from "../../lib/format";
import GameCover from "../game/GameCover";
import { PLAYED_OPTIONS } from "../gamelog/playedOptions";
import Dropdown from "../ui/Dropdown";
import Progress from "../ui/Progress";
import RatingMeter from "../ui/RatingMeter";
import type { AchievementState, SteamChoice, SteamDraft } from "./steamChoices";

const CHOICES: { value: SteamChoice; label: string }[] = [
    { value: "played", label: "Played" },
    { value: "playing", label: "Playing" },
    { value: "backlog", label: "Backlog" },
    { value: "skip", label: "Skip" },
];

const hoursText = (hours: number) =>
    hours === 0 ? "Not played" : `${hours} ${hours === 1 ? "hour" : "hours"}`;

const ofTotal = ({ unlocked, total }: { unlocked: number; total: number }) =>
    `${formatCount(unlocked)} of ${formatCount(total)}`;

/** The achievements, as the row's line says them: nothing for a game with
 *  none, or when the profile hides them, as a notice above says so once. */
const AchievementsText = ({
    state,
}: {
    state: AchievementState | undefined;
}) => {
    if (!state) return null;
    switch (state.kind) {
        case "loading":
            return (
                <span className="animate-pulse motion-reduce:animate-none">
                    Checking achievements…
                </span>
            );
        case "failed":
            return (
                <span className="text-warning">Achievements didn’t load</span>
            );
        case "done":
            return state.value ? (
                <span>{ofTotal(state.value)} achievements</span>
            ) : null;
        case "private":
            return null;
    }
};

/** Set or missing, so it's plain what opening the game would add. */
const Detail = ({ set, children }: { set: boolean; children: string }) => (
    <span className={set ? "text-content-secondary" : "text-content-muted"}>
        {children}
    </span>
);

/**
 * One game in the import: its status, and under it what it'll go in with.
 * Opened, the row itself holds its rating and ending, lined up under the
 * title, rather than a card of its own.
 */
const SteamGameRow = ({
    item,
    draft,
    achievements,
    open,
    onToggle,
    onChange,
}: {
    item: SteamLibraryItem;
    draft: SteamDraft;
    achievements: AchievementState | undefined;
    open: boolean;
    onToggle: () => void;
    onChange: (draft: SteamDraft) => void;
}) => {
    const game = item.game!;
    const skipped = draft.choice === "skip";
    const played = draft.choice === "played";
    const expanded = open && !skipped;
    const ending = draft.playedStatus
        ? STATUS_PRESENTATION[draft.playedStatus].label
        : null;
    const got = achievements?.kind === "done" ? achievements.value : null;
    const panelId = `steam-details-${game.id}`;
    const summaryId = `steam-summary-${game.id}`;
    const endingId = `steam-ending-${game.id}`;

    return (
        <li className="border-b border-subtle py-1 last:border-b-0">
            <div
                className={cn(
                    "-mx-2 rounded-md px-2 py-1.5 transition-colors motion-reduce:transition-none",
                    expanded && "bg-surface-hover"
                )}
            >
                <div className="flex items-center gap-2 sm:gap-3">
                    {/* The whole game is the way into its details, so a phone
                        gives the title the room a separate button would take. */}
                    <button
                        type="button"
                        onClick={onToggle}
                        disabled={skipped}
                        aria-expanded={expanded}
                        aria-controls={panelId}
                        aria-label={`Details for ${game.title}`}
                        aria-describedby={summaryId}
                        className={cn(
                            "flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-sm text-left",
                            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                            "disabled:cursor-default"
                        )}
                    >
                        <GameCover
                            coverUrl={game.coverUrl}
                            title={game.title}
                            className={cn(
                                "aspect-3/4 w-9 shrink-0 rounded-xs",
                                skipped && "opacity-50"
                            )}
                        />
                        <span id={summaryId} className="min-w-0 flex-1">
                            <span
                                className={cn(
                                    "line-clamp-2 text-body-sm break-words",
                                    skipped
                                        ? "text-content-muted"
                                        : "text-content"
                                )}
                            >
                                {game.title}
                            </span>
                            <span className="flex flex-wrap gap-x-2 text-label-sm text-content-muted">
                                <span>{hoursText(item.hours)}</span>
                                <AchievementsText state={achievements} />
                            </span>
                            {!skipped && (
                                <span className="flex flex-wrap gap-x-2 text-label-sm">
                                    <Detail set={draft.rating !== null}>
                                        {draft.rating !== null
                                            ? `Rated ${draft.rating}`
                                            : "Not rated"}
                                    </Detail>
                                    {played && (
                                        <Detail set>
                                            {ending ?? "Just played"}
                                        </Detail>
                                    )}
                                </span>
                            )}
                        </span>
                        {!skipped && (
                            <ChevronDown
                                size={16}
                                aria-hidden
                                className={cn(
                                    "shrink-0 text-content-secondary transition-transform motion-reduce:transition-none",
                                    expanded && "rotate-180"
                                )}
                            />
                        )}
                    </button>
                    <Dropdown
                        options={CHOICES}
                        value={draft.choice}
                        onChange={(value) =>
                            onChange({ ...draft, choice: value as SteamChoice })
                        }
                        aria-label={`${game.title}: add as`}
                        className="w-28 shrink-0 sm:w-32"
                    />
                </div>

                {expanded && (
                    <div
                        id={panelId}
                        className="flex flex-col gap-4 pt-4 pb-1 sm:pl-12"
                    >
                        {/* One row is open at a time, so its label needn't
                            name the game. */}
                        <RatingMeter
                            value={draft.rating}
                            onChange={(rating) =>
                                onChange({ ...draft, rating })
                            }
                            label="Your rating"
                        />
                        {(played || got) && (
                            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                                {played && (
                                    // Labelled as the meter labels itself.
                                    <div className="flex flex-col gap-2.5">
                                        <label
                                            htmlFor={endingId}
                                            className="text-label text-content-muted"
                                        >
                                            How it ended
                                        </label>
                                        <Dropdown
                                            id={endingId}
                                            options={PLAYED_OPTIONS}
                                            value={draft.playedStatus ?? ""}
                                            onChange={(value) =>
                                                onChange({
                                                    ...draft,
                                                    playedStatus: (value ||
                                                        null) as PlayedStatus | null,
                                                })
                                            }
                                        />
                                    </div>
                                )}
                                {got && (
                                    <div className="flex flex-col gap-2.5">
                                        <p className="flex justify-between gap-3 text-label">
                                            <span className="text-content-muted">
                                                Achievements from Steam
                                            </span>
                                            <span className="text-content-secondary tabular-nums">
                                                {ofTotal(got)} ·{" "}
                                                {formatPercent(
                                                    got.unlocked / got.total
                                                )}
                                            </span>
                                        </p>
                                        {/* The dropdown's height beside it, so
                                            the bar sits level with its middle. */}
                                        <div className="flex items-center sm:h-11">
                                            <Progress
                                                value={got.unlocked / got.total}
                                                label={`${ofTotal(got)} achievements unlocked`}
                                                size="sm"
                                                fillClassName="bg-status-mastered"
                                                className="w-full"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </li>
    );
};

export default SteamGameRow;

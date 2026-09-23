import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { GameLogWithGame } from "../api";
import { useGame, usePlatformSystems } from "../hooks/queries/useGames";
import { useGameLogMutations } from "../hooks/queries/useGameLogs";
import { useMyReview, useReviewMutations } from "../hooks/queries/useReviews";
import { useNotify } from "../contexts/NotificationContext";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import Toggle from "./ui/Toggle";
import Field from "./ui/Field";
import { Input, NumberInput, Textarea } from "./ui/Input";
import RatingMeter from "./ui/RatingMeter";
import Dropdown from "./ui/Dropdown";
import { systemOptions } from "../lib/platformIcons";
import { familyOf, systemsForGame } from "../lib/gameSystems";
import { StatusPlates } from "./gamelog/StatusPlates";
import {
    achievementFraction,
    emptyDraft,
    logReducer,
    toGameLogInput,
    validateDraft,
} from "./gamelog/logEditorReducer";
import { X } from "lucide-react";
import { formatPercent } from "../lib/format";

interface CreateOrEditGameLogPopupProps {
    closePopup: () => void;
    viewUpdatedLog: () => void;
    gamelog?: GameLogWithGame | null;
    gameID?: number;
    editing: boolean;
    /** Opened from a review control, so open on the review field. */
    focusReview?: boolean;
}

/**
 * The log editor. The review is a separate resource with no transaction
 * between the two, so save writes the log first and reports a partial success
 * if the review fails.
 */
const CreateOrEditGameLogPopup = ({
    closePopup,
    viewUpdatedLog,
    gamelog,
    gameID,
    editing,
    focusReview = false,
}: CreateOrEditGameLogPopupProps) => {
    const gameId = gamelog?.gameId ?? gameID!;
    const notify = useNotify();
    const reviewRef = useRef<HTMLTextAreaElement>(null);

    const { data: game } = useGame(gameId);
    const { data: systems } = usePlatformSystems();
    const { data: review, isLoading: reviewLoading } = useMyReview(gameId);
    const { save, remove } = useGameLogMutations();
    const { save: saveReview, remove: removeReview } = useReviewMutations();

    const [draft, dispatch] = useReducer(logReducer, emptyDraft);
    const [error, setError] = useState<string | null>(null);
    const [hydrated, setHydrated] = useState(false);

    // Wait for the review, or a blank note overwrites a real one on save.
    useEffect(() => {
        if (hydrated || reviewLoading) return;
        dispatch({
            type: "hydrate",
            log: gamelog ?? null,
            review: review
                ? { body: review.body, isPublic: review.isPublic }
                : null,
        });
        setHydrated(true);
    }, [hydrated, reviewLoading, gamelog, review]);

    // Only once hydrated: before that the form's height isn't final.
    useEffect(() => {
        if (!focusReview || !hydrated) return;
        reviewRef.current?.scrollIntoView({ block: "center" });
        reviewRef.current?.focus({ preventScroll: true });
    }, [focusReview, hydrated]);

    // Only what this game is actually on: the full list runs to every machine
    // in the catalogue, which is not something anyone should scroll.
    const available = useMemo(
        () => systemsForGame(systems ?? [], game?.systems ?? [], draft.system),
        [systems, game?.systems, draft.system]
    );

    const progress = useMemo(() => achievementFraction(draft), [draft]);
    const busy = save.isPending || saveReview.isPending || remove.isPending;

    const handleSave = async () => {
        const problem = validateDraft(draft);
        if (problem) return setError(problem);
        setError(null);

        try {
            await save.mutateAsync({
                gameId,
                input: toGameLogInput(draft),
            });
        } catch {
            notify("Couldn't save that entry", "error");
            return;
        }

        const body = draft.reviewBody.trim();
        const hadReview = !!review;
        try {
            if (body) {
                await saveReview.mutateAsync({
                    gameId,
                    input: { body, isPublic: draft.reviewIsPublic },
                });
            } else if (hadReview) {
                await removeReview.mutateAsync(gameId);
            }
        } catch {
            // The log did save, so don't imply a blanket failure.
            notify("Entry saved, but your note didn't send", "error");
            viewUpdatedLog();
            return;
        }

        notify(editing ? "Entry updated" : "Entry saved", "success");
        viewUpdatedLog();
    };

    const handleDelete = async () => {
        if (!gamelog) return;
        try {
            // Keyed by game, not by log row: gamelog.id 404s here.
            await remove.mutateAsync(gamelog.gameId);
            notify("Log deleted", "success");
            closePopup();
        } catch {
            notify("Couldn't delete that log", "error");
        }
    };

    return (
        <Modal
            onClose={closePopup}
            labelledBy="log-editor-title"
            showCloseButton={false}
            className="w-full max-w-[880px] p-0! sm:p-0!"
        >
            <header className="flex items-center gap-4 border-b border-subtle px-5 py-4 sm:px-6">
                <div className="min-w-0 flex-1">
                    <h2
                        id="log-editor-title"
                        className="font-display text-[28px] leading-tight text-content"
                    >
                        {game?.title ?? "…"}
                    </h2>
                </div>
                <button
                    type="button"
                    onClick={closePopup}
                    aria-label="Close"
                    className="flex size-11 shrink-0 items-center justify-center rounded-sm text-content-muted lift hover:bg-surface-hover hover:text-content sm:size-auto sm:p-2"
                >
                    <X size={20} />
                </button>
            </header>

            <div className="flex flex-col gap-5 px-5 py-5 sm:px-6">
                <StatusPlates
                    value={draft.status}
                    onChange={(value) => dispatch({ type: "status", value })}
                    playedStatus={draft.playedStatus}
                    onPlayedStatusChange={(value) =>
                        dispatch({ type: "playedStatus", value })
                    }
                />

                <div className="rounded-md border border-subtle bg-surface-sunken/50 px-5 py-4">
                    <RatingMeter
                        value={draft.rating}
                        onChange={(value) =>
                            dispatch({ type: "rating", value })
                        }
                        label="Your rating"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
                    <Field label="Hours played">
                        {(a11y) => (
                            <NumberInput
                                step={0.5}
                                min={0}
                                placeholder="0"
                                value={draft.hoursPlayed}
                                onChange={(e) =>
                                    dispatch({
                                        type: "set",
                                        field: "hoursPlayed",
                                        value: e.target.value,
                                    })
                                }
                                {...a11y}
                            />
                        )}
                    </Field>
                    <Field label="Hours to beat">
                        {(a11y) => (
                            <NumberInput
                                step={0.5}
                                min={0}
                                placeholder="0"
                                value={draft.hoursToBeat}
                                onChange={(e) =>
                                    dispatch({
                                        type: "set",
                                        field: "hoursToBeat",
                                        value: e.target.value,
                                    })
                                }
                                {...a11y}
                            />
                        )}
                    </Field>
                    <Field label="Started">
                        {(a11y) => (
                            <Input
                                type="date"
                                value={draft.startDate}
                                onChange={(e) =>
                                    dispatch({
                                        type: "set",
                                        field: "startDate",
                                        value: e.target.value,
                                    })
                                }
                                {...a11y}
                            />
                        )}
                    </Field>
                    <Field label="Finished">
                        {(a11y) => (
                            <Input
                                type="date"
                                value={draft.finishDate}
                                onChange={(e) =>
                                    dispatch({
                                        type: "set",
                                        field: "finishDate",
                                        value: e.target.value,
                                    })
                                }
                                {...a11y}
                            />
                        )}
                    </Field>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                    <div>
                        <span
                            id="log-platform-label"
                            className="mb-2 block text-label text-content-muted"
                        >
                            Platform
                        </span>
                        <Dropdown
                            options={systemOptions(available, "Not set")}
                            value={draft.system}
                            placeholder="Not set"
                            aria-labelledby="log-platform-label"
                            onChange={(value) =>
                                dispatch({
                                    type: "system",
                                    value,
                                    platform: familyOf(available, value) ?? "",
                                })
                            }
                        />
                    </div>

                    <div>
                        <div className="mb-2 flex items-baseline justify-between gap-3">
                            <span className="text-label text-content-muted">
                                Achievements
                            </span>
                            {progress !== null && (
                                <span className="text-label-sm text-status-played">
                                    {formatPercent(progress)} ·{" "}
                                    {draft.achievementsCompleted} of{" "}
                                    {draft.achievementsTotal}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2.5">
                            <NumberInput
                                min={0}
                                aria-label="Achievements completed"
                                placeholder="0"
                                value={draft.achievementsCompleted}
                                onChange={(e) =>
                                    dispatch({
                                        type: "set",
                                        field: "achievementsCompleted",
                                        value: e.target.value,
                                    })
                                }
                                className="w-22"
                            />
                            <span className="font-mono text-[13px] text-content-muted">
                                of
                            </span>
                            <NumberInput
                                min={0}
                                aria-label="Achievements total"
                                placeholder="0"
                                value={draft.achievementsTotal}
                                onChange={(e) =>
                                    dispatch({
                                        type: "set",
                                        field: "achievementsTotal",
                                        value: e.target.value,
                                    })
                                }
                                className="w-22"
                            />
                            <span className="h-2.5 flex-1 bg-surface-sunken">
                                <span
                                    className="block h-full bg-brand transition-[width]"
                                    style={{
                                        width: `${(progress ?? 0) * 100}%`,
                                    }}
                                />
                            </span>
                        </div>
                    </div>
                </div>

                <div>
                    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-3">
                        <span className="text-label text-content-muted">
                            Review (optional)
                        </span>
                        <div className="flex items-center gap-3.5">
                            <Toggle
                                checked={draft.reviewIsPublic}
                                onChange={(value) =>
                                    dispatch({
                                        type: "set",
                                        field: "reviewIsPublic",
                                        value,
                                    })
                                }
                                label={
                                    draft.reviewIsPublic ? "Public" : "Private"
                                }
                            />
                            <span className="text-label-sm text-content-muted">
                                {draft.reviewBody.length} / 5000
                            </span>
                        </div>
                    </div>
                    <Textarea
                        ref={reviewRef}
                        rows={3}
                        maxLength={5000}
                        aria-label="Review"
                        value={draft.reviewBody}
                        onChange={(e) =>
                            dispatch({
                                type: "set",
                                field: "reviewBody",
                                value: e.target.value,
                            })
                        }
                        className="min-h-[74px] leading-relaxed"
                        placeholder="What stayed with you?"
                    />
                </div>

                {error && (
                    <p role="alert" className="text-body-sm text-danger">
                        {error}
                    </p>
                )}
            </div>

            <footer className="flex flex-col-reverse gap-3 border-t border-subtle bg-surface-raised px-5 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:px-6">
                {editing && gamelog && (
                    <button
                        type="button"
                        onClick={() => void handleDelete()}
                        disabled={busy}
                        className="min-h-11 text-label text-danger lift hover:underline disabled:opacity-60 sm:min-h-0"
                    >
                        Delete this log
                    </button>
                )}
                <div className="flex flex-col-reverse gap-2.5 sm:ml-auto sm:flex-row">
                    <Button
                        variant="secondary"
                        onClick={closePopup}
                        disabled={busy}
                        className="w-full sm:w-auto"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => void handleSave()}
                        disabled={busy}
                        className="w-full sm:w-auto"
                    >
                        {busy ? "Saving…" : "Save entry"}
                    </Button>
                </div>
            </footer>
        </Modal>
    );
};

export default CreateOrEditGameLogPopup;

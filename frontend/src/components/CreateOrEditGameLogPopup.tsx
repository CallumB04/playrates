import { useEffect, useMemo, useReducer, useState } from "react";
import type { GameLogWithGame } from "../api";
import { useGame, usePlatforms } from "../hooks/queries/useGames";
import { useGameLogMutations } from "../hooks/queries/useGameLogs";
import { useMyReview, useReviewMutations } from "../hooks/queries/useReviews";
import { useNotify } from "../contexts/NotificationContext";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import Chip from "./ui/Chip";
import Toggle from "./ui/Toggle";
import Field from "./ui/Field";
import { Input, NumberInput, Textarea } from "./ui/Input";
import RatingRule from "./ui/RatingRule";
import GameCover from "./game/GameCover";
import { StatusPlates, PlayedStatusPlates } from "./gamelog/StatusPlates";
import {
    achievementFraction,
    emptyDraft,
    logReducer,
    toGameLogInput,
    validateDraft,
} from "./gamelog/logEditorReducer";
import { formatPercent } from "../lib/format";

interface CreateOrEditGameLogPopupProps {
    closePopup: () => void;
    viewUpdatedLog: () => void;
    gamelog?: GameLogWithGame | null;
    gameID?: number;
    editing: boolean;
}

/**
 * All ten fields on one surface — no scrolling between steps, no wizard.
 *
 * The review is a different resource: the log goes to /me/game-logs and the
 * note to /me/reviews, with no transaction between them. Save writes the log
 * first (that is what you came for) and reports a partial success if the note
 * fails, rather than implying nothing was written.
 */
const CreateOrEditGameLogPopup = ({
    closePopup,
    viewUpdatedLog,
    gamelog,
    gameID,
    editing,
}: CreateOrEditGameLogPopupProps) => {
    const gameId = gamelog?.gameId ?? gameID!;
    const notify = useNotify();

    const { data: game } = useGame(gameId);
    const { data: platforms } = usePlatforms();
    const { data: review, isLoading: reviewLoading } = useMyReview(gameId);
    const { save, remove } = useGameLogMutations();
    const { save: saveReview, remove: removeReview } = useReviewMutations();

    const [draft, dispatch] = useReducer(logReducer, emptyDraft);
    const [error, setError] = useState<string | null>(null);
    const [hydrated, setHydrated] = useState(false);

    /* Wait for the review before hydrating, or a blank note would overwrite a
       real one the moment you pressed save. */
    useEffect(() => {
        if (hydrated || reviewLoading) return;
        dispatch({
            type: "hydrate",
            log: gamelog ?? null,
            review: review ? { body: review.body, isPublic: review.isPublic } : null,
        });
        setHydrated(true);
    }, [hydrated, reviewLoading, gamelog, review]);

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
            // The log is already saved — say so rather than implying a
            // blanket failure and inviting a duplicate submit.
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
            await remove.mutateAsync(gamelog.id);
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
            <header className="flex items-center gap-4 rule-double px-6 py-4">
                <GameCover
                    coverUrl={game?.coverUrl ?? null}
                    title={game?.title ?? ""}
                    className="aspect-3/4 w-13 shrink-0 shadow-cover"
                />
                <div className="min-w-0 flex-1">
                    <p className="text-label text-content-muted">
                        Your log
                    </p>
                    <h2
                        id="log-editor-title"
                        className="mt-0.5 font-display text-[28px] leading-tight text-content"
                    >
                        {game?.title ?? "…"}
                    </h2>
                </div>
                <button
                    type="button"
                    onClick={closePopup}
                    className="lift shrink-0 rounded-sm border border-subtle px-2.5 py-1.5 text-label-sm text-content-muted hover:border-strong hover:text-content"
                >
                    Esc
                </button>
            </header>

            <div className="flex flex-col gap-5 px-6 py-5">
                <StatusPlates
                    value={draft.status}
                    onChange={(value) => dispatch({ type: "status", value })}
                />

                {draft.status === "played" && (
                    <PlayedStatusPlates
                        value={draft.playedStatus}
                        onChange={(value) =>
                            dispatch({ type: "playedStatus", value })
                        }
                    />
                )}

                <div className="rounded-md border border-subtle bg-surface-sunken/50 px-5 py-4">
                    <RatingRule
                        value={draft.rating}
                        onChange={(value) => dispatch({ type: "rating", value })}
                        label="Your rating"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
                    <Field label="Hours played">
                        {(a11y) => (
                            <NumberInput
                                step={0.5}
                                min={0}
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
                    <fieldset>
                        <legend className="mb-2 text-label text-content-muted">
                            Platform
                        </legend>
                        <div className="flex flex-wrap gap-1.5">
                            {(platforms ?? []).map((platform) => (
                                <Chip
                                    key={platform.slug}
                                    selected={draft.platform === platform.slug}
                                    onClick={() =>
                                        dispatch({
                                            type: "set",
                                            field: "platform",
                                            // tapping the selected chip clears it
                                            value:
                                                draft.platform === platform.slug
                                                    ? ""
                                                    : platform.slug,
                                        })
                                    }
                                >
                                    {platform.displayName}
                                </Chip>
                            ))}
                        </div>
                    </fieldset>

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
                            Review — optional
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
                                label={draft.reviewIsPublic ? "Public" : "Private"}
                            />
                            <span className="text-label-sm text-content-muted">
                                {draft.reviewBody.length} / 5000
                            </span>
                        </div>
                    </div>
                    <Textarea
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

            <footer className="flex flex-wrap items-center gap-3 border-t border-subtle bg-surface-raised px-6 py-4">
                {editing && gamelog && (
                    <button
                        type="button"
                        onClick={() => void handleDelete()}
                        disabled={busy}
                        className="lift text-label text-danger hover:underline disabled:opacity-60"
                    >
                        Delete this log
                    </button>
                )}
                <div className="ml-auto flex gap-2.5">
                    <Button
                        variant="secondary"
                        onClick={closePopup}
                        disabled={busy}
                    >
                        Cancel
                    </Button>
                    <Button onClick={() => void handleSave()} disabled={busy}>
                        {busy ? "Saving…" : "Save entry"}
                    </Button>
                </div>
            </footer>
        </Modal>
    );
};

export default CreateOrEditGameLogPopup;

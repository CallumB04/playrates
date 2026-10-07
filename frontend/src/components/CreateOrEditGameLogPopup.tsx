import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { headlineOf } from "@playrates/shared";
import { ApiError } from "../api";
import { useGame, usePlatformSystems } from "../hooks/queries/useGames";
import {
    useLogMutations,
    useMyGameLogIds,
    useMyLogBundle,
} from "../hooks/queries/useGameLogs";
import { logMilestone } from "../lib/logMilestone";
import { readLastSystem, writeLastSystem } from "../lib/drafts";
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
import SystemPicker from "./gamelog/SystemPicker";
import { usePlayedOn } from "./gamelog/usePlayedOn";
import { StatusPlates } from "./gamelog/StatusPlates";
import Progress from "./ui/Progress";
import DeleteGameLogPopup from "./gamelog/DeleteGameLogPopup";
import {
    achievementFraction,
    emptyDraft,
    fieldsFor,
    filledDetails,
    HOURS_HINT,
    logReducer,
    toGameLogInput,
    unreadableHours,
    validateDraft,
} from "./gamelog/logEditorReducer";
import { ChevronDown, X } from "lucide-react";
import { cn } from "../lib/cn";
import { formatPercent, formatRating } from "../lib/format";

interface CreateOrEditGameLogPopupProps {
    gameId: number;
    /** The log to edit. null starts one on another console; left out, it is
     *  whichever log the game has, or a new one if it has none. */
    logId?: number | null;
    /** Opened from a review control, so open on the review field. */
    focusReview?: boolean;
    onClose: () => void;
}

/**
 * The log editor. The review is a separate resource with no transaction
 * between the two, so save writes the log first and reports a partial success
 * if the review fails.
 */
const CreateOrEditGameLogPopup = ({
    gameId,
    logId,
    focusReview = false,
    onClose,
}: CreateOrEditGameLogPopupProps) => {
    const notify = useNotify();
    const reviewRef = useRef<HTMLTextAreaElement>(null);
    const playedOn = usePlayedOn();

    const { data: game } = useGame(gameId);
    const { data: systems } = usePlatformSystems();
    const mutations = useLogMutations();
    // How many games are logged before this one, for a milestone.
    const { data: loggedIds } = useMyGameLogIds();

    /* Fetched rather than handed in: opened from a rail or a tile there is
       only a game id to hand, and hydrating from nothing put every existing
       log back to "played" on save. */
    const { data: bundle, isLoading: bundleLoading } = useMyLogBundle(gameId);
    const logs = useMemo(() => bundle?.logs ?? [], [bundle]);
    const existing =
        logId === null
            ? null
            : logId !== undefined
              ? (logs.find((l) => l.id === logId) ?? null)
              : headlineOf(logs);
    const others = logs.filter((l) => l.id !== existing?.id);
    const logged = others
        .map((l) => l.system)
        .filter((s): s is string => s !== null);

    /* Once a game has a log on one console, the console is what tells this
       log from the others, so it leads and has to be chosen. A log that
       never named one can stay that way. */
    const perConsole = others.length > 0;
    const consoleRequired = perConsole && !(existing && !existing.system);

    const [draft, dispatch] = useReducer(logReducer, emptyDraft);
    const [error, setError] = useState<string | null>(null);
    const [consoleError, setConsoleError] = useState<string | null>(null);
    const [hydrated, setHydrated] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);

    useEffect(() => {
        if (hydrated || bundleLoading) return;
        dispatch({
            type: "hydrate",
            log: existing,
            review: existing?.review
                ? {
                      body: existing.review.body,
                      isPublic: existing.review.isPublic,
                      containsSpoilers: existing.review.containsSpoilers,
                  }
                : null,
        });
        setHydrated(true);
        // A log that already has details opens with them showing.
        setDetailsOpen(
            !!existing &&
                (existing.hoursPlayed !== null ||
                    existing.hoursToBeat !== null ||
                    existing.startDate !== null ||
                    existing.finishDate !== null ||
                    (!perConsole && !!existing.system) ||
                    existing.achievementsTotal !== null)
        );
    }, [hydrated, bundleLoading, existing, perConsole]);

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

    /* A new log starts on the machine the last one was saved on, when this
       game is on it and it isn't logged already: most people play on one or
       two, and choosing it every time is work the site can do. */
    const [presetSystem, setPresetSystem] = useState(false);
    useEffect(() => {
        if (presetSystem || !hydrated || existing || draft.system) return;
        // the game's own machines, not the whole list it falls back to
        if (!game || available.length === 0) return;
        setPresetSystem(true);
        const last = readLastSystem();
        if (!last || logged.includes(last)) return;
        if (!available.some((s) => s.slug === last)) return;
        dispatch({
            type: "system",
            value: last,
            platform: familyOf(available, last) ?? "",
        });
    }, [
        presetSystem,
        hydrated,
        existing,
        draft.system,
        available,
        game,
        logged,
    ]);

    const chooseSystem = (value: string) => {
        setConsoleError(null);
        dispatch({
            type: "system",
            value,
            platform: familyOf(available, value) ?? "",
        });
    };

    const consoleName = playedOn({
        system: draft.system || null,
        platform: draft.platform || null,
    }).name;
    // What the rest of your logs of it scored, to rate this one against.
    const otherRatings = others
        .filter((l) => l.rating !== null)
        .map((l) => {
            const name = playedOn(l).name;
            return `${formatRating(l.rating)}${name ? ` on ${name}` : ""}`;
        });

    const progress = useMemo(() => achievementFraction(draft), [draft]);
    const fields = fieldsFor(draft.status);
    const filled = filledDetails(draft);
    const busy =
        mutations.create.isPending ||
        mutations.update.isPending ||
        mutations.saveReview.isPending ||
        mutations.removeReview.isPending;

    const handleSave = async () => {
        if (consoleRequired && !draft.system) {
            return setConsoleError("Pick the platform this log is for.");
        }
        const problem = validateDraft(draft);
        if (problem) return setError(problem);
        setError(null);

        const input = toGameLogInput(draft);
        let saved;
        try {
            saved = existing
                ? await mutations.update.mutateAsync({
                      logId: existing.id,
                      input,
                  })
                : await mutations.create.mutateAsync({ gameId, ...input });
        } catch (failure) {
            if (
                failure instanceof ApiError &&
                failure.code === "platform_taken"
            ) {
                setConsoleError(
                    `You've already logged this on ${consoleName ?? "that platform"}.`
                );
                return;
            }
            notify("Couldn't save that entry", "error");
            return;
        }
        if (draft.system) writeLastSystem(draft.system);

        const body = draft.reviewBody.trim();
        const hadReview = !!existing?.review;
        try {
            if (body) {
                await mutations.saveReview.mutateAsync({
                    logId: saved.id,
                    input: {
                        body,
                        isPublic: draft.reviewIsPublic,
                        containsSpoilers: draft.reviewSpoilers,
                    },
                });
            } else if (hadReview) {
                await mutations.removeReview.mutateAsync(saved.id);
            }
        } catch {
            // The log did save, so don't imply a blanket failure. Critical
            // because the note is the part the user wrote by hand: they have
            // to see this, not catch it out of the corner of an eye.
            notify(
                "Entry saved, but your note didn't send",
                "error",
                "critical"
            );
            onClose();
            return;
        }

        // A new game that lands on a milestone says so: the moment people
        // remember a site by. Another console of a game already logged isn't
        // a new game, and ordinary saves stay plain.
        const milestone =
            logs.length === 0
                ? logMilestone((loggedIds?.length ?? 0) + 1)
                : null;
        notify(
            milestone ??
                (existing
                    ? "Entry updated"
                    : logs.length > 0
                      ? `Added ${consoleName ?? "another platform"} to your logs`
                      : "Entry saved"),
            "success"
        );
        onClose();
    };

    return (
        <Modal
            onClose={onClose}
            labelledBy="log-editor-title"
            showCloseButton={false}
            className="w-full max-w-[880px] p-0! sm:p-0!"
        >
            {/* Header and footer stay put while the form scrolls between
                them, so Save is never a scroll away from the field just set. */}
            <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-subtle bg-surface-raised px-5 py-4 sm:px-6">
                <div className="min-w-0 flex-1">
                    <h2
                        id="log-editor-title"
                        className="font-display text-[28px] leading-tight text-content"
                    >
                        {game?.title ?? "…"}
                    </h2>
                    {(perConsole || logId === null) && (
                        <p className="mt-0.5 text-body-sm text-content-muted">
                            {existing
                                ? existing.system
                                    ? `Your log on ${consoleName ?? "this platform"}`
                                    : "Your log"
                                : "A log on another platform"}
                        </p>
                    )}
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="flex size-11 shrink-0 items-center justify-center rounded-sm text-content-muted lift hover:bg-surface-hover hover:text-content sm:size-auto sm:p-2"
                >
                    <X size={20} />
                </button>
            </header>

            <div className="flex flex-col gap-5 px-5 py-5 sm:px-6">
                {perConsole && (
                    <div>
                        <span
                            id="log-console-label"
                            className="mb-2 block text-label text-content-muted"
                        >
                            Platform
                        </span>
                        <SystemPicker
                            systems={available}
                            value={draft.system}
                            onChange={chooseSystem}
                            logged={logged}
                            labelledBy="log-console-label"
                            describedBy={
                                consoleError ? "log-console-error" : undefined
                            }
                        />
                        {consoleError && (
                            <p
                                id="log-console-error"
                                role="alert"
                                className="mt-2 text-body-sm text-danger"
                            >
                                {consoleError}
                            </p>
                        )}
                    </div>
                )}

                <StatusPlates
                    value={draft.status}
                    onChange={(value) => dispatch({ type: "status", value })}
                    playedStatus={draft.playedStatus}
                    onPlayedStatusChange={(value) =>
                        dispatch({ type: "playedStatus", value })
                    }
                />

                {fields.has("rating") && (
                    <div className="rounded-md border border-subtle bg-surface-sunken/50 px-5 py-4">
                        <RatingMeter
                            value={draft.rating}
                            onChange={(value) =>
                                dispatch({ type: "rating", value })
                            }
                            label="Your rating"
                        />
                        {otherRatings.length > 0 && (
                            <p className="mt-2 text-label-sm text-content-muted">
                                You gave it {otherRatings.join(", ")}
                            </p>
                        )}
                    </div>
                )}

                {(fields.has("review") || focusReview) && (
                    <div>
                        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-3">
                            <span className="text-label text-content-muted">
                                Review (optional)
                            </span>
                            <div className="flex flex-wrap items-center gap-3.5">
                                <Toggle
                                    checked={draft.reviewSpoilers}
                                    onChange={(value) =>
                                        dispatch({
                                            type: "set",
                                            field: "reviewSpoilers",
                                            value,
                                        })
                                    }
                                    label="Spoilers"
                                />
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
                                        draft.reviewIsPublic
                                            ? "Public"
                                            : "Private"
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
                            placeholder={
                                perConsole && consoleName
                                    ? `What was it like on ${consoleName}?`
                                    : "What stayed with you?"
                            }
                        />
                    </div>
                )}

                {/* The rest is detail most logs never fill in, so it waits
                    behind one press, open from the start where it's filled. */}
                <div className="border-t border-subtle pt-4">
                    <button
                        type="button"
                        aria-expanded={detailsOpen}
                        aria-controls="log-details"
                        onClick={() => setDetailsOpen((open) => !open)}
                        className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 text-left text-label text-content-secondary hover:text-content sm:min-h-9"
                    >
                        <span>
                            {detailsOpen ? "Fewer details" : "More details"}
                            {!detailsOpen && filled > 0 && (
                                <span className="ml-2 text-content-muted">
                                    {filled} filled in
                                </span>
                            )}
                        </span>
                        <ChevronDown
                            size={16}
                            aria-hidden
                            className={cn(
                                "shrink-0 transition-transform",
                                detailsOpen && "rotate-180"
                            )}
                        />
                    </button>
                    {detailsOpen && (
                        <div
                            id="log-details"
                            className="mt-3 flex flex-col gap-5"
                        >
                            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
                                {fields.has("hoursPlayed") && (
                                    <Field
                                        label="Hours played"
                                        error={
                                            unreadableHours(draft.hoursPlayed)
                                                ? HOURS_HINT
                                                : undefined
                                        }
                                    >
                                        {(a11y) => (
                                            <Input
                                                inputMode="decimal"
                                                autoComplete="off"
                                                placeholder="0"
                                                className="font-mono tabular-nums"
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
                                )}
                                <Field
                                    label="Hours to beat"
                                    error={
                                        unreadableHours(draft.hoursToBeat)
                                            ? HOURS_HINT
                                            : undefined
                                    }
                                >
                                    {(a11y) => (
                                        <Input
                                            inputMode="decimal"
                                            autoComplete="off"
                                            placeholder="0"
                                            className="font-mono tabular-nums"
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
                                {fields.has("startDate") && (
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
                                )}
                                {fields.has("finishDate") && (
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
                                )}
                            </div>

                            <div className="grid gap-5 lg:grid-cols-2">
                                {!perConsole && (
                                    <div>
                                        <span
                                            id="log-platform-label"
                                            className="mb-2 block text-label text-content-muted"
                                        >
                                            Platform
                                        </span>
                                        <Dropdown
                                            options={systemOptions(
                                                available,
                                                "Not set"
                                            )}
                                            value={draft.system}
                                            placeholder="Not set"
                                            aria-labelledby="log-platform-label"
                                            onChange={chooseSystem}
                                        />
                                        {consoleError && (
                                            <p
                                                role="alert"
                                                className="mt-2 text-body-sm text-danger"
                                            >
                                                {consoleError}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {fields.has("achievements") && (
                                    <div>
                                        <div className="mb-2 flex items-baseline justify-between gap-3">
                                            <span className="text-label text-content-muted">
                                                Achievements
                                            </span>
                                            {progress !== null && (
                                                <span className="text-label-sm text-status-played">
                                                    {formatPercent(progress)} ·{" "}
                                                    {
                                                        draft.achievementsCompleted
                                                    }{" "}
                                                    of {draft.achievementsTotal}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2.5">
                                            <NumberInput
                                                min={0}
                                                aria-label="Achievements completed"
                                                placeholder="0"
                                                value={
                                                    draft.achievementsCompleted
                                                }
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
                                            <Progress
                                                size="lg"
                                                value={progress ?? 0}
                                                label="Achievements earned"
                                                className="flex-1"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {error && (
                    <p role="alert" className="text-body-sm text-danger">
                        {error}
                    </p>
                )}
            </div>

            <footer className="sticky bottom-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-subtle bg-surface-raised px-5 pt-3 pb-[calc(--spacing(3)+env(safe-area-inset-bottom))] sm:px-6 sm:py-4">
                {existing && (
                    <button
                        type="button"
                        onClick={() => setConfirmingDelete(true)}
                        disabled={busy}
                        className="min-h-11 text-label text-danger lift hover:underline disabled:opacity-60 sm:min-h-0"
                    >
                        Delete this log
                    </button>
                )}
                <div className="flex w-full gap-2.5 sm:ml-auto sm:w-auto">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        disabled={busy}
                        className="flex-1 sm:flex-none"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => void handleSave()}
                        disabled={busy}
                        className="flex-1 sm:flex-none"
                    >
                        {busy ? "Saving…" : "Save entry"}
                    </Button>
                </div>
            </footer>

            {/* Deleting takes the rating, the hours and the review with it, so
                it asks first — the same dialog the profile uses. */}
            {confirmingDelete && existing && (
                <DeleteGameLogPopup
                    log={existing}
                    gameTitle={game?.title}
                    othersCount={others.length}
                    closePopup={() => setConfirmingDelete(false)}
                    onDeleted={onClose}
                />
            )}
        </Modal>
    );
};

export default CreateOrEditGameLogPopup;

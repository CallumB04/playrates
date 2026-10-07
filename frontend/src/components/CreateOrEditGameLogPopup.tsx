import { useEffect, useMemo, useRef, useState } from "react";
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
    fieldsFor,
    filledDetails,
    HOURS_HINT,
    logReducer,
    toGameLogInput,
    unreadableHours,
    validateDraft,
    type LogAction,
} from "./gamelog/logEditorReducer";
import {
    isDirty,
    NEW_TAB,
    needsConsole,
    newTab,
    startingTab,
    tabForLog,
    takenBy,
    type LogTab,
} from "./gamelog/logTabs";
import { ChevronDown, Plus, X } from "lucide-react";
import { cn } from "../lib/cn";
import { formatPercent, formatRating } from "../lib/format";

interface CreateOrEditGameLogPopupProps {
    gameId: number;
    /** The log to open on. null opens a new one on another console; left
     *  out, the log that speaks for the game, or a new one if it has none. */
    logId?: number | null;
    /** Opened from a review control, so open on the review field. */
    focusReview?: boolean;
    onClose: () => void;
}

/**
 * The log editor, with a tab for each console the game is logged on and a
 * "+" for another. Each tab keeps its own changes, and Save writes every tab
 * that has any. The review is a separate resource with no transaction between
 * the two, so a log saves first and a failed review is reported on its own.
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
    const { data: bundle } = useMyLogBundle(gameId);

    const [tabs, setTabs] = useState<LogTab[]>([]);
    const [active, setActive] = useState<string>(NEW_TAB);
    const [hydrated, setHydrated] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [consoleError, setConsoleError] = useState<string | null>(null);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);

    useEffect(() => {
        if (hydrated || !bundle) return;
        const initial = bundle.logs.map(tabForLog);
        if (logId === null || initial.length === 0) initial.push(newTab());
        setTabs(initial);
        setActive(startingTab(initial, logId, headlineOf(bundle.logs)?.id));
        setHydrated(true);
    }, [hydrated, bundle, logId]);

    const tab = tabs.find((t) => t.key === active);
    const draft = tab?.draft ?? newTab().draft;
    const dispatch = (action: LogAction) =>
        setTabs((all) =>
            all.map((t) =>
                t.key === active
                    ? { ...t, draft: logReducer(t.draft, action) }
                    : t
            )
        );
    const savedCount = bundle?.logs.length ?? 0;
    const several = tabs.length > 1;
    const taken = takenBy(tabs, active);

    // A tab that already has details opens with them showing.
    useEffect(() => {
        setError(null);
        setConsoleError(null);
        setDetailsOpen(!!tab?.original && filledDetails(tab.original) > 0);
        // Only on moving between tabs, not on every keystroke in one.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, hydrated]);

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
    const free = useMemo(
        () =>
            systemsForGame(systems ?? [], game?.systems ?? []).filter(
                (s) => !tabs.some((t) => t.draft.system === s.slug)
            ),
        [systems, game?.systems, tabs]
    );

    /* A new log starts on the machine the last one was saved on, when this
       game is on it and no other tab has it: most people play on one or two,
       and choosing it every time is work the site can do. */
    const [presetFor, setPresetFor] = useState<string | null>(null);
    useEffect(() => {
        if (!hydrated || !tab || tab.logId !== null || draft.system) return;
        if (presetFor === tab.key || !game || !systems) return;
        setPresetFor(tab.key);
        const last = readLastSystem();
        if (!last || taken.includes(last)) return;
        if (!available.some((s) => s.slug === last)) return;
        dispatch({
            type: "system",
            value: last,
            platform: familyOf(available, last) ?? "",
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hydrated, tab?.key, draft.system, game, systems]);

    const chooseSystem = (value: string) => {
        setConsoleError(null);
        dispatch({
            type: "system",
            value,
            platform: familyOf(available, value) ?? "",
        });
    };

    const nameOf = (t: LogTab) =>
        playedOn({
            system: t.draft.system || null,
            platform: t.draft.platform || null,
        }).name;
    const consoleName = tab ? nameOf(tab) : null;

    /** "+" adds a tab for another console, one at a time. */
    const addTab = () => {
        if (tabs.some((t) => t.key === NEW_TAB)) return setActive(NEW_TAB);
        setTabs((all) => [...all, newTab()]);
        setActive(NEW_TAB);
    };
    const discardNewTab = () => {
        const rest = tabs.filter((t) => t.key !== NEW_TAB);
        if (rest.length === 0) return onClose();
        setTabs(rest);
        setActive(rest[0]!.key);
    };

    // What the rest of your logs of it scored, to rate this one against.
    const otherRatings = tabs
        .filter((t) => t.key !== active && t.draft.rating !== null)
        .map((t) => {
            const name = nameOf(t);
            return `${formatRating(t.draft.rating)}${name ? ` on ${name}` : ""}`;
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
        const pending = tabs.filter(isDirty);
        if (pending.length === 0) return onClose();

        // Every tab checks out before anything is written.
        for (const t of pending) {
            if (needsConsole(t, tabs)) {
                setActive(t.key);
                setConsoleError("Pick the platform this log is for.");
                return;
            }
            const problem = validateDraft(t.draft);
            if (problem) {
                setActive(t.key);
                setError(problem);
                return;
            }
        }

        let next = tabs;
        let created = false;
        for (const t of pending) {
            const input = toGameLogInput(t.draft);
            let saved;
            try {
                saved =
                    t.logId !== null
                        ? await mutations.update.mutateAsync({
                              logId: t.logId,
                              input,
                          })
                        : await mutations.create.mutateAsync({
                              gameId,
                              ...input,
                          });
            } catch (failure) {
                // What did save stays saved; this tab is left to fix.
                setTabs(next);
                setActive(t.key);
                if (
                    failure instanceof ApiError &&
                    failure.code === "platform_taken"
                ) {
                    setConsoleError(
                        `You've already logged this on ${nameOf(t) ?? "that platform"}.`
                    );
                } else {
                    notify("Couldn't save that entry", "error");
                }
                return;
            }
            created ||= t.logId === null;
            if (t.draft.system) writeLastSystem(t.draft.system);

            const body = t.draft.reviewBody.trim();
            try {
                if (body) {
                    await mutations.saveReview.mutateAsync({
                        logId: saved.id,
                        input: {
                            body,
                            isPublic: t.draft.reviewIsPublic,
                            containsSpoilers: t.draft.reviewSpoilers,
                        },
                    });
                } else if (t.hadReview) {
                    await mutations.removeReview.mutateAsync(saved.id);
                }
            } catch {
                // The log did save, so don't imply a blanket failure. Critical
                // because the note is the part the user wrote by hand: they
                // have to see this, not catch it out of the corner of an eye.
                notify(
                    "Entry saved, but your note didn't send",
                    "error",
                    "critical"
                );
                onClose();
                return;
            }
            next = next.map((x) =>
                x.key === t.key
                    ? { ...x, logId: saved.id, original: x.draft }
                    : x
            );
        }

        // A new game that lands on a milestone says so: the moment people
        // remember a site by. Another console of a game already logged isn't
        // a new game, and ordinary saves stay plain.
        const milestone =
            savedCount === 0 && created
                ? logMilestone((loggedIds?.length ?? 0) + 1)
                : null;
        const only = pending.length === 1 ? pending[0]! : null;
        notify(
            milestone ??
                (!only
                    ? "Logs updated"
                    : only.logId !== null
                      ? "Entry updated"
                      : savedCount > 0
                        ? `Added ${nameOf(only) ?? "another platform"} to your logs`
                        : "Entry saved"),
            "success"
        );
        onClose();
    };

    const deletable =
        tab &&
        tab.logId !== null &&
        bundle?.logs.find((l) => l.id === tab.logId);

    return (
        <Modal
            onClose={onClose}
            labelledBy="log-editor-title"
            showCloseButton={false}
            className="w-full max-w-[880px] p-0! sm:p-0!"
        >
            {/* Header and footer stay put while the form scrolls between
                them, so Save is never a scroll away from the field just set. */}
            <header
                className={cn(
                    "sticky top-0 z-10 border-b border-subtle bg-surface-raised px-5 pt-4 sm:px-6",
                    savedCount > 0 ? "pb-0" : "pb-4"
                )}
            >
                <div className="flex items-center gap-4">
                    <h2
                        id="log-editor-title"
                        className="min-w-0 flex-1 font-display text-[28px] leading-tight text-content"
                    >
                        {game?.title ?? "…"}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="flex size-11 shrink-0 items-center justify-center rounded-sm text-content-muted lift hover:bg-surface-hover hover:text-content sm:size-auto sm:p-2"
                    >
                        <X size={20} />
                    </button>
                </div>
                {savedCount > 0 && (
                    /* A tab per console, like the shelves on a game page:
                       scrolls inside itself on a phone rather than pushing
                       the page sideways. */
                    <div className="-mx-5 mt-3 -mb-px flex items-end gap-1 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
                        <div
                            role="tablist"
                            aria-label="Your logs of this game"
                            className="flex items-end gap-1"
                        >
                            {tabs.map((t) => {
                                const selected = t.key === active;
                                const on = playedOn({
                                    system: t.draft.system || null,
                                    platform: t.draft.platform || null,
                                });
                                const Mark = on.Icon;
                                const name =
                                    on.name ??
                                    (t.logId === null
                                        ? "New platform"
                                        : "No platform");
                                return (
                                    <span
                                        key={t.key}
                                        className={cn(
                                            "flex shrink-0 items-center border-b-2",
                                            selected
                                                ? "border-brand"
                                                : "border-transparent"
                                        )}
                                    >
                                        <button
                                            type="button"
                                            role="tab"
                                            aria-selected={selected}
                                            onClick={() => setActive(t.key)}
                                            className={cn(
                                                "flex min-h-11 cursor-pointer items-center gap-1.5 px-3 text-label whitespace-nowrap lift",
                                                selected
                                                    ? "text-content"
                                                    : "text-content-muted hover:text-content"
                                            )}
                                        >
                                            {on.name && (
                                                <Mark
                                                    size={14}
                                                    aria-hidden
                                                    className="shrink-0"
                                                />
                                            )}
                                            {name}
                                            {isDirty(t) && t.logId !== null && (
                                                <span
                                                    aria-label="unsaved changes"
                                                    className="size-1.5 rounded-full bg-brand"
                                                />
                                            )}
                                        </button>
                                        {t.key === NEW_TAB && (
                                            <button
                                                type="button"
                                                onClick={discardNewTab}
                                                aria-label="Discard this log"
                                                className="relative -ml-1 flex size-6 cursor-pointer items-center justify-center rounded-sm text-content-muted before:absolute before:-inset-2.5 before:content-[''] hover:bg-surface-hover hover:text-content"
                                            >
                                                <X size={13} aria-hidden />
                                            </button>
                                        )}
                                    </span>
                                );
                            })}
                        </div>
                        {/* Greyed out, not hidden, once every console is
                            logged: it says why there is nothing to add. */}
                        <button
                            type="button"
                            onClick={addTab}
                            disabled={
                                free.length === 0 ||
                                tabs.some((t) => t.key === NEW_TAB)
                            }
                            aria-label="Add a platform"
                            title={
                                free.length === 0
                                    ? "Logged on every platform it's on"
                                    : "Add a platform"
                            }
                            className="mb-1 ml-1 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-dashed border-strong text-content-secondary lift hover:border-brand hover:text-content disabled:cursor-not-allowed disabled:border-subtle disabled:text-content-muted disabled:opacity-50 disabled:hover:border-subtle sm:size-9"
                        >
                            <Plus size={16} aria-hidden />
                        </button>
                    </div>
                )}
            </header>

            <div className="flex flex-col gap-5 px-5 py-5 sm:px-6">
                {tab?.logId === null && savedCount > 0 && (
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
                            logged={taken}
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
                                several && consoleName
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
                                {!(tab?.logId === null && savedCount > 0) && (
                                    <div>
                                        <span
                                            id="log-platform-label"
                                            className="mb-2 block text-label text-content-muted"
                                        >
                                            Platform
                                        </span>
                                        <Dropdown
                                            options={systemOptions(
                                                available.filter(
                                                    (s) =>
                                                        !taken.includes(s.slug)
                                                ),
                                                tab &&
                                                    needsConsole(
                                                        {
                                                            ...tab,
                                                            draft: {
                                                                ...draft,
                                                                system: "",
                                                            },
                                                        },
                                                        tabs
                                                    )
                                                    ? undefined
                                                    : "Not set"
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
                {deletable && (
                    <button
                        type="button"
                        onClick={() => setConfirmingDelete(true)}
                        disabled={busy}
                        className="min-h-11 text-label text-danger lift hover:underline disabled:opacity-60 sm:min-h-0"
                    >
                        {several && consoleName
                            ? `Delete ${consoleName} log`
                            : "Delete this log"}
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
                        {busy
                            ? "Saving…"
                            : tabs.filter(isDirty).length > 1
                              ? "Save all"
                              : "Save entry"}
                    </Button>
                </div>
            </footer>

            {/* Deleting takes the rating, the hours and the review with it, so
                it asks first — the same dialog the profile uses. */}
            {confirmingDelete && deletable && (
                <DeleteGameLogPopup
                    log={deletable}
                    gameTitle={game?.title}
                    othersCount={savedCount - 1}
                    closePopup={() => setConfirmingDelete(false)}
                    onDeleted={() => {
                        setConfirmingDelete(false);
                        const rest = tabs.filter((t) => t.key !== active);
                        if (rest.length === 0) return onClose();
                        setTabs(rest);
                        setActive(rest[0]!.key);
                    }}
                />
            )}
        </Modal>
    );
};

export default CreateOrEditGameLogPopup;

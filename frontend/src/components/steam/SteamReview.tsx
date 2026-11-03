import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SteamPreview } from "@playrates/shared";
import { importSteamLibrary } from "../../api";
import { useNotify } from "../../contexts/NotificationContext";
import { formatCount } from "../../lib/format";
import Button from "../ui/Button";
import Progress from "../ui/Progress";
import Toggle from "../ui/Toggle";
import SteamGameRow from "./SteamGameRow";
import {
    achievementsToAsk,
    addButtonLabel,
    fillCounts,
    fillFrom,
    fillList,
    fillSummary,
    importFrom,
    importedMessage,
    isAddable,
    onePerGame,
    startingDrafts,
    type SteamDraft,
} from "./steamChoices";
import { useSteamAchievements } from "./useSteamAchievements";

const SHOWN_AT_ONCE = 100;

const games = (n: number) => `${formatCount(n)} ${n === 1 ? "game" : "games"}`;

/**
 * The library, looked over before anything is added: each game's status,
 * rating and ending, with its achievements coming in from Steam as the
 * list sits there. Games already logged get only their blanks filled.
 */
const SteamReview = ({
    preview,
    onClose,
}: {
    preview: SteamPreview;
    onClose: () => void;
}) => {
    const notify = useNotify();
    const queryClient = useQueryClient();
    const items = useMemo(() => onePerGame(preview.items), [preview.items]);
    const [drafts, setDrafts] = useState(() => startingDrafts(items));
    const [shown, setShown] = useState(SHOWN_AT_ONCE);
    const [openId, setOpenId] = useState<number | null>(null);
    const [fillOn, setFillOn] = useState(true);

    const asked = useMemo(() => achievementsToAsk(items), [items]);
    const achievements = useSteamAchievements(preview.steamId, asked);

    const { addable, logged, unmatched } = useMemo(
        () => ({
            addable: items.filter(isAddable),
            logged: items.filter((i) => i.logged).length,
            unmatched: items.filter((i) => !i.game),
        }),
        [items]
    );
    const chosen = importFrom(addable, drafts).length;
    const counts = fillCounts(items, achievements.states);
    const filling = fillOn ? counts.games : 0;

    const add = useMutation({
        mutationFn: () =>
            importSteamLibrary({
                games: importFrom(addable, drafts, achievements.states),
                ...(fillOn
                    ? { fill: fillFrom(items, achievements.states) }
                    : {}),
            }),
        onSuccess: (result) => {
            // Shelves, stats, progress and the home page all moved.
            void queryClient.invalidateQueries();
            notify(importedMessage(result), "success");
            onClose();
        },
        onError: () => notify("Those didn’t go in. Try again.", "error"),
    });

    const setDraft = (id: number, draft: SteamDraft) =>
        setDrafts((current) => new Map(current).set(id, draft));

    return (
        <div className="flex flex-col gap-4 pt-4">
            <div>
                <p className="text-body font-medium text-content">
                    {addable.length === 0
                        ? "Nothing new to add"
                        : `${games(addable.length)} to add`}
                </p>
                <p className="mt-0.5 text-label-sm text-content-muted">
                    {addable.length === 0
                        ? "Everything we found is on your shelves already."
                        : "Open a game to rate it or say how it ended."}
                </p>
            </div>

            {achievements.total > 0 && (
                <AchievementsProgress {...achievements} />
            )}

            {addable.length > 0 && (
                <ul className="-mx-2 flex max-h-[50dvh] flex-col overflow-y-auto px-2">
                    {addable.slice(0, shown).map((item) => {
                        const id = item.game!.id;
                        return (
                            <SteamGameRow
                                key={id}
                                item={item}
                                draft={drafts.get(id)!}
                                achievements={achievements.states.get(
                                    item.appid
                                )}
                                open={openId === id}
                                onToggle={() =>
                                    setOpenId((was) => (was === id ? null : id))
                                }
                                onChange={(draft) => setDraft(id, draft)}
                            />
                        );
                    })}
                    {addable.length > shown && (
                        <li className="pt-2">
                            <Button
                                variant="ghost"
                                onClick={() =>
                                    setShown((n) => n + SHOWN_AT_ONCE)
                                }
                                className="w-full"
                            >
                                Show{" "}
                                {formatCount(
                                    Math.min(
                                        SHOWN_AT_ONCE,
                                        addable.length - shown
                                    )
                                )}{" "}
                                more
                            </Button>
                        </li>
                    )}
                </ul>
            )}

            {(logged > 0 || unmatched.length > 0) && (
                <div className="flex flex-col gap-3 border-t border-subtle pt-4">
                    {counts.games > 0 ? (
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <p className="text-body-sm font-medium text-content">
                                    Fill in {games(counts.games)} you’ve logged
                                </p>
                                <p className="mt-0.5 text-label-sm text-content-muted">
                                    {fillSummary(counts)}. Nothing you’ve set
                                    changes.
                                </p>
                                <Disclosure label="Which games">
                                    <ul className="flex flex-col gap-0.5">
                                        {fillList(
                                            items,
                                            achievements.states
                                        ).map(({ title, fills }) => (
                                            <li key={title}>
                                                <span className="text-content-secondary">
                                                    {title}
                                                </span>{" "}
                                                · {fills}
                                            </li>
                                        ))}
                                    </ul>
                                </Disclosure>
                            </div>
                            <Toggle
                                checked={fillOn}
                                onChange={setFillOn}
                                label={`Fill in ${games(counts.games)} you’ve logged`}
                                labelPosition="hidden"
                            />
                        </div>
                    ) : (
                        logged > 0 && (
                            <p className="text-label-sm text-content-muted">
                                {games(logged)} already on your shelves, left as
                                they are.
                            </p>
                        )
                    )}
                    {unmatched.length > 0 && (
                        <Disclosure
                            label={`${games(unmatched.length)} we couldn’t match`}
                        >
                            {unmatched.map((i) => i.name).join(", ")}
                        </Disclosure>
                    )}
                </div>
            )}

            <div className="flex flex-col-reverse gap-2 border-t border-subtle pt-4 sm:flex-row sm:items-center sm:justify-end">
                <Button
                    variant="secondary"
                    onClick={onClose}
                    className="w-full sm:w-auto"
                >
                    Cancel
                </Button>
                <Button
                    onClick={() => add.mutate()}
                    disabled={(chosen === 0 && filling === 0) || add.isPending}
                    className="w-full sm:w-auto"
                >
                    {add.isPending
                        ? "Adding…"
                        : addButtonLabel(chosen, filling)}
                </Button>
            </div>
        </div>
    );
};

/** A quiet "show more" line, its chevron turning as it opens. */
const Disclosure = ({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) => (
    <details className="group mt-1.5 text-label-sm text-content-muted">
        <summary className="relative inline-flex cursor-pointer list-none items-center gap-1 font-medium text-content-secondary before:absolute before:-inset-x-1 before:-inset-y-3 before:content-[''] hover:text-content sm:before:hidden [&::-webkit-details-marker]:hidden">
            {label}
            <ChevronDown
                size={14}
                aria-hidden
                className="transition-transform group-open:rotate-180 motion-reduce:transition-none"
            />
        </summary>
        <div className="mt-1.5">{children}</div>
    </details>
);

/** Where the achievements have got to: a sweep, then a bar, then a line on
 *  any Steam kept back. Adding early is fine and says what it costs. */
const AchievementsProgress = ({
    total,
    settled,
    failed,
    hidden,
    retry,
}: ReturnType<typeof useSteamAchievements>) => {
    if (settled < total) {
        return (
            <div className="flex flex-col gap-1.5" aria-live="polite">
                <p className="flex justify-between gap-3 text-label-sm">
                    <span className="text-content-secondary">
                        Checking Steam for achievements
                    </span>
                    <span className="font-mono text-content-muted tabular-nums">
                        {formatCount(settled)}/{formatCount(total)}
                    </span>
                </p>
                {/* A sweep until the first batch is back, so it reads as
                    working rather than stuck at none. */}
                <Progress
                    value={settled > 0 ? settled / total : undefined}
                    label="Achievements checked"
                    size="sm"
                />
                <p className="text-label-sm text-content-muted">
                    Add now and any not checked yet go in without them.
                </p>
            </div>
        );
    }
    if (hidden) {
        return (
            <p className="text-label-sm text-content-muted">
                Steam keeps your achievements private, so they won’t come in.
                Everything else will.
            </p>
        );
    }
    if (failed > 0) {
        return (
            <p className="flex flex-wrap items-center gap-x-2 text-label-sm text-warning">
                Achievements didn’t load for {games(failed)}.
                <Button variant="ghost" size="sm" onClick={retry}>
                    Try again
                </Button>
            </p>
        );
    }
    return null;
};

export default SteamReview;

import { useId, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SteamPreview } from "@playrates/shared";
import { ApiError, importSteamLibrary, previewSteamLibrary } from "../../api";
import { useNotify } from "../../contexts/NotificationContext";
import { formatCount } from "../../lib/format";
import GameCover from "../game/GameCover";
import Button from "../ui/Button";
import { Input } from "../ui/Input";
import { fieldClass } from "../ui/fieldClass";
import Modal from "../ui/Modal";
import { importFrom, startingChoices, type SteamChoice } from "./steamChoices";

const SHOWN_AT_ONCE = 100;

const failure = (error: unknown): string => {
    if (error instanceof ApiError) {
        if (error.code === "steam_private") {
            return "That library is private. In Steam, set Game details to Public in your profile’s Privacy Settings, then try again.";
        }
        if (error.status === 404) return "We couldn’t find that Steam profile.";
        if (error.status === 422) {
            return "That isn’t a Steam profile link, name or id.";
        }
        if (error.status === 429)
            return "That’s a lot of looking. Try again in a minute.";
    }
    return "Steam didn’t answer. Try again in a moment.";
};

const hoursText = (hours: number) =>
    hours === 0 ? "Not played" : `${hours} ${hours === 1 ? "hour" : "hours"}`;

/**
 * Bring in a Steam library: find it, look it over, add it. Every game
 * starts as a suggestion (played if it has playtime, otherwise the
 * backlog) and nothing is added until the button is pressed.
 */
const SteamImportModal = ({
    initialProfile = "",
    onClose,
}: {
    initialProfile?: string;
    onClose: () => void;
}) => {
    const titleId = useId();
    const notify = useNotify();
    const queryClient = useQueryClient();
    const [profile, setProfile] = useState(initialProfile);
    const [preview, setPreview] = useState<SteamPreview | null>(null);
    const [choices, setChoices] = useState<Map<number, SteamChoice>>(new Map());
    const [shown, setShown] = useState(SHOWN_AT_ONCE);

    const find = useMutation({
        mutationFn: () => previewSteamLibrary(profile),
        onSuccess: (found) => {
            setPreview(found);
            setChoices(startingChoices(found.items));
        },
    });

    const add = useMutation({
        mutationFn: () =>
            importSteamLibrary({
                games: importFrom(preview?.items ?? [], choices),
            }),
        onSuccess: ({ added }) => {
            // Shelves, stats, progress and the home page all moved.
            void queryClient.invalidateQueries();
            notify(
                `Added ${formatCount(added)} ${added === 1 ? "game" : "games"} to your shelves`,
                "success"
            );
            onClose();
        },
        onError: () => notify("Those didn’t go in. Try again.", "error"),
    });

    const { addable, logged, unmatched } = useMemo(() => {
        const items = preview?.items ?? [];
        return {
            addable: items.filter((i) => i.game && !i.logged),
            logged: items.filter((i) => i.logged).length,
            unmatched: items.filter((i) => !i.game),
        };
    }, [preview]);
    const chosen = importFrom(addable, choices).length;

    return (
        <Modal
            onClose={onClose}
            labelledBy={titleId}
            className="w-full max-w-2xl"
        >
            <h2
                id={titleId}
                className="border-b border-subtle pb-3 font-display text-section text-content"
            >
                Import from Steam
            </h2>

            {!preview ? (
                <form
                    className="flex flex-col gap-4 pt-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        find.mutate();
                    }}
                >
                    <p className="text-body-sm text-content-secondary">
                        Paste your Steam profile link, or your custom profile
                        name. Your game details need to be public on Steam.
                        You’ll see everything before anything is added.
                    </p>
                    <label className="flex flex-col gap-2">
                        <span className="text-label text-content-secondary">
                            Steam profile
                        </span>
                        <Input
                            value={profile}
                            onChange={(event) => setProfile(event.target.value)}
                            placeholder="steamcommunity.com/id/yourname"
                            autoComplete="off"
                            aria-invalid={find.isError || undefined}
                            maxLength={200}
                        />
                    </label>
                    {find.isError && (
                        <p role="alert" className="text-body-sm text-danger">
                            {failure(find.error)}
                        </p>
                    )}
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            className="w-full sm:w-auto"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                profile.trim().length < 2 || find.isPending
                            }
                            className="w-full sm:w-auto"
                        >
                            {find.isPending ? "Looking…" : "Find my games"}
                        </Button>
                    </div>
                </form>
            ) : (
                <div className="flex flex-col gap-4 pt-4">
                    <p className="text-body-sm text-content-secondary">
                        {addable.length === 0
                            ? "Nothing new to add: every game we could find is on your shelves already."
                            : `${formatCount(addable.length)} ${addable.length === 1 ? "game" : "games"} to add. Games you’ve played start as Played with your Steam hours, the rest go to your Backlog. Change any before you add them.`}
                    </p>

                    {addable.length > 0 && (
                        <ul className="-mx-1 flex max-h-[50dvh] flex-col overflow-y-auto px-1">
                            {addable.slice(0, shown).map((item) => {
                                const game = item.game!;
                                return (
                                    <li
                                        key={game.id}
                                        className="flex items-center gap-3 border-b border-subtle py-2 last:border-b-0"
                                    >
                                        <GameCover
                                            coverUrl={game.coverUrl}
                                            title={game.title}
                                            className="aspect-3/4 w-9 shrink-0 rounded-xs"
                                        />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-body-sm text-content">
                                                {game.title}
                                            </span>
                                            <span className="block text-label-sm text-content-muted">
                                                {hoursText(item.hours)}
                                            </span>
                                        </span>
                                        <span className="w-28 shrink-0">
                                            <select
                                                aria-label={game.title}
                                                value={
                                                    choices.get(game.id) ??
                                                    "skip"
                                                }
                                                onChange={(event) =>
                                                    setChoices((current) =>
                                                        new Map(current).set(
                                                            game.id,
                                                            event.target
                                                                .value as SteamChoice
                                                        )
                                                    )
                                                }
                                                className={fieldClass(
                                                    "py-1.5 sm:min-h-9"
                                                )}
                                            >
                                                <option value="played">
                                                    Played
                                                </option>
                                                <option value="backlog">
                                                    Backlog
                                                </option>
                                                <option value="skip">
                                                    Skip
                                                </option>
                                            </select>
                                        </span>
                                    </li>
                                );
                            })}
                            {addable.length > shown && (
                                <li className="pt-3">
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
                        <div className="flex flex-col gap-1 text-label-sm text-content-muted">
                            {logged > 0 && (
                                <p>
                                    {formatCount(logged)} already on your
                                    shelves, left as they are.
                                </p>
                            )}
                            {unmatched.length > 0 && (
                                <details>
                                    <summary className="cursor-pointer">
                                        {formatCount(unmatched.length)} we
                                        couldn’t match to a game here
                                    </summary>
                                    <p className="mt-1">
                                        {unmatched
                                            .map((i) => i.name)
                                            .join(", ")}
                                    </p>
                                </details>
                            )}
                        </div>
                    )}

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Button
                            variant="secondary"
                            onClick={onClose}
                            className="w-full sm:w-auto"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => add.mutate()}
                            disabled={chosen === 0 || add.isPending}
                            className="w-full sm:w-auto"
                        >
                            {add.isPending
                                ? "Adding…"
                                : `Add ${formatCount(chosen)} ${chosen === 1 ? "game" : "games"}`}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default SteamImportModal;

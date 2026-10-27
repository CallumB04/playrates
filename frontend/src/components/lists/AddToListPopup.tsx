import { useId, useState } from "react";
import { Check, Lock, Plus, Users } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { Skeleton } from "../ui/Skeleton";
import { ApiError } from "../../api";
import { useNotify } from "../../contexts/NotificationContext";
import { useGame } from "../../hooks/queries/useGames";
import { useMyLists, useToggleListGame } from "../../hooks/queries/useLists";
import { accentHue, avatarGradient } from "../../lib/profileAccent";
import { formatCount } from "../../lib/format";
import { cn } from "../../lib/cn";
import ListEditor from "./ListEditor";

interface AddToListPopupProps {
    gameId: number;
    onClose: () => void;
}

/**
 * Which of your lists a game is in, each a tick that saves as it's
 * pressed, and a new list started with it already in.
 */
const AddToListPopup = ({ gameId, onClose }: AddToListPopupProps) => {
    const titleId = useId();
    const notify = useNotify();
    const { data: game } = useGame(gameId);
    const { data: lists, isLoading } = useMyLists(gameId);
    const toggle = useToggleListGame(gameId);
    const [creating, setCreating] = useState(false);

    if (creating) {
        return (
            <ListEditor
                startWith={[gameId]}
                onClose={onClose}
                onSaved={(list) => notify(`Added to ${list.name}`, "success")}
            />
        );
    }

    return (
        <Modal
            onClose={onClose}
            labelledBy={titleId}
            className="w-full max-w-md"
        >
            <h2
                id={titleId}
                className="pr-10 font-display text-section text-content"
            >
                Add to list
            </h2>
            {game && (
                <p className="mt-1 truncate text-body-sm text-content-muted">
                    {game.title}
                </p>
            )}

            <div className="mt-4">
                {isLoading ? (
                    <div className="flex flex-col gap-1.5">
                        {Array.from({ length: 3 }, (_, i) => (
                            <Skeleton key={i} className="h-12 rounded-md" />
                        ))}
                    </div>
                ) : (lists ?? []).length === 0 ? (
                    <p className="py-2 text-body-sm text-content-muted">
                        You haven’t made a list yet.
                    </p>
                ) : (
                    // Room for a few at a glance; past that it scrolls on
                    // its own, the buttons staying put.
                    <ul className="-mx-1 flex max-h-[45dvh] flex-col gap-1 overflow-y-auto px-1">
                        {(lists ?? []).map((list) => {
                            const Hidden =
                                list.visibility === "private"
                                    ? Lock
                                    : list.visibility === "friends"
                                      ? Users
                                      : null;
                            return (
                                <li key={list.id}>
                                    <button
                                        type="button"
                                        role="checkbox"
                                        aria-checked={list.hasGame}
                                        onClick={() =>
                                            toggle.mutate(
                                                {
                                                    listId: list.id,
                                                    add: !list.hasGame,
                                                },
                                                {
                                                    onError: (error) =>
                                                        notify(
                                                            error instanceof
                                                                ApiError &&
                                                                error.status ===
                                                                    422
                                                                ? error.message
                                                                : "Couldn't change that list",
                                                            "error"
                                                        ),
                                                }
                                            )
                                        }
                                        className={cn(
                                            "flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left lift",
                                            "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                                            list.hasGame
                                                ? "bg-surface-sunken"
                                                : "hover:bg-surface-hover"
                                        )}
                                    >
                                        <span
                                            aria-hidden
                                            className="size-2.5 shrink-0 rounded-full bg-surface-sunken ring-1 ring-strong"
                                            style={
                                                list.colour
                                                    ? {
                                                          backgroundImage:
                                                              avatarGradient(
                                                                  accentHue(
                                                                      list.colour
                                                                  )
                                                              ),
                                                      }
                                                    : undefined
                                            }
                                        />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-body-sm font-medium text-content">
                                                {list.name}
                                            </span>
                                            <span className="flex items-center gap-1.5 text-label-sm text-content-muted">
                                                {formatCount(list.gameCount)}{" "}
                                                {list.gameCount === 1
                                                    ? "game"
                                                    : "games"}
                                                {Hidden && (
                                                    <Hidden
                                                        size={11}
                                                        aria-label={
                                                            list.visibility ===
                                                            "private"
                                                                ? "Only you"
                                                                : "Friends"
                                                        }
                                                    />
                                                )}
                                            </span>
                                        </span>
                                        <span
                                            aria-hidden
                                            className={cn(
                                                "grid size-5 shrink-0 place-items-center rounded-xs border",
                                                list.hasGame
                                                    ? "border-action-edge bg-action text-action-ink"
                                                    : "border-strong"
                                            )}
                                        >
                                            {list.hasGame && (
                                                <Check
                                                    size={13}
                                                    strokeWidth={3}
                                                />
                                            )}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <div className="mt-4 flex flex-col-reverse gap-2 border-t border-subtle pt-4 sm:flex-row sm:justify-between">
                <Button
                    variant="secondary"
                    onClick={() => setCreating(true)}
                    className="w-full sm:w-auto"
                >
                    <Plus size={15} aria-hidden />
                    New list
                </Button>
                <Button onClick={onClose} className="w-full sm:w-auto">
                    Done
                </Button>
            </div>
        </Modal>
    );
};

export default AddToListPopup;

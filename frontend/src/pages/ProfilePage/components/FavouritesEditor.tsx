import { useState } from "react";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { MAX_FAVOURITE_GAMES, type Game } from "@playrates/shared";
import Modal from "../../../components/ui/Modal";
import Button from "../../../components/ui/Button";
import GameCover from "../../../components/game/GameCover";
import GamePicker, {
    type PickedGame,
} from "../../../components/community/GamePicker";
import { useSetFavourites } from "../../../hooks/queries/useFavourites";
import { useNotify } from "../../../contexts/NotificationContext";
import { ApiError } from "../../../api";
import { moveItem } from "../lib/about";

const ICON_BUTTON =
    "relative grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-content-secondary lift before:absolute before:-inset-1.5 before:content-[''] hover:bg-surface-hover hover:text-content disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-brand";

interface FavouritesEditorProps {
    current: Game[];
    onClose: () => void;
}

/** Choose up to five, from anywhere in the catalogue, and put them in order. */
const FavouritesEditor = ({ current, onClose }: FavouritesEditorProps) => {
    const notify = useNotify();
    const save = useSetFavourites();
    const [games, setGames] = useState<PickedGame[]>(() =>
        current.map(({ id, title, coverUrl }) => ({ id, title, coverUrl }))
    );
    const full = games.length >= MAX_FAVOURITE_GAMES;

    const add = (game: PickedGame | null) => {
        if (!game || full || games.some((g) => g.id === game.id)) return;
        setGames([...games, game]);
    };

    const onSave = async () => {
        try {
            await save.mutateAsync(games.map((g) => g.id));
            notify("Favourites saved", "success");
            onClose();
        } catch (error) {
            notify(
                error instanceof ApiError &&
                    error.status !== undefined &&
                    error.status < 500
                    ? error.message
                    : "Your favourites didn't save, please try again",
                "error"
            );
        }
    };

    return (
        <Modal
            onClose={onClose}
            labelledBy="favourites-title"
            className="w-full max-w-lg"
        >
            <h2
                id="favourites-title"
                className="font-display text-section text-content"
            >
                Favourite games
            </h2>
            <p className="mt-1 text-body-sm text-content-secondary">
                Up to five, shown in this order on your profile.
            </p>

            {games.length > 0 && (
                <ol className="mt-4 flex flex-col gap-1">
                    {games.map((game, i) => (
                        <li
                            key={game.id}
                            className="flex items-center gap-3 rounded-sm bg-surface-sunken p-2"
                        >
                            <span className="w-4 shrink-0 text-center font-mono text-label-sm text-content-muted">
                                {i + 1}
                            </span>
                            <GameCover
                                coverUrl={game.coverUrl}
                                title={game.title}
                                className="aspect-3/4 w-8 shrink-0 overflow-hidden rounded-xs"
                            />
                            <span className="min-w-0 flex-1 truncate text-body-sm text-content">
                                {game.title}
                            </span>
                            <button
                                type="button"
                                aria-label={`Move ${game.title} up`}
                                disabled={i === 0}
                                onClick={() =>
                                    setGames(moveItem(games, i, i - 1))
                                }
                                className={ICON_BUTTON}
                            >
                                <ArrowUp size={15} aria-hidden />
                            </button>
                            <button
                                type="button"
                                aria-label={`Move ${game.title} down`}
                                disabled={i === games.length - 1}
                                onClick={() =>
                                    setGames(moveItem(games, i, i + 1))
                                }
                                className={ICON_BUTTON}
                            >
                                <ArrowDown size={15} aria-hidden />
                            </button>
                            <button
                                type="button"
                                aria-label={`Remove ${game.title}`}
                                onClick={() =>
                                    setGames(
                                        games.filter((g) => g.id !== game.id)
                                    )
                                }
                                className={ICON_BUTTON}
                            >
                                <X size={15} aria-hidden />
                            </button>
                        </li>
                    ))}
                </ol>
            )}

            <div className="mt-4">
                {full ? (
                    <p className="text-label text-content-muted">
                        That’s five. Remove one to add another.
                    </p>
                ) : (
                    <GamePicker value={null} onChange={add} />
                )}
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 border-t border-subtle pt-4 sm:flex-row sm:justify-end">
                <Button
                    variant="secondary"
                    onClick={onClose}
                    className="w-full sm:w-auto"
                >
                    Cancel
                </Button>
                <Button
                    onClick={() => void onSave()}
                    disabled={save.isPending}
                    className="w-full sm:w-auto"
                >
                    {save.isPending ? "Saving…" : "Save favourites"}
                </Button>
            </div>
        </Modal>
    );
};

export default FavouritesEditor;

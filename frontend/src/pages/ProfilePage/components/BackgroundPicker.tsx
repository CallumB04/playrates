import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronLeft } from "lucide-react";
import { DEFAULT_BACKGROUND_POSITION, type Profile } from "@playrates/shared";
import Modal from "../../../components/ui/Modal";
import Button, { buttonClass } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import Pagination from "../../../components/ui/Pagination";
import GameCover from "../../../components/game/GameCover";
import { Skeleton } from "../../../components/ui/Skeleton";
import { useUserShelf } from "../../../hooks/queries/useGameLogs";
import { useGameBackdrops } from "../../../hooks/queries/useGames";
import {
    useClearBackground,
    useSetBackground,
} from "../../../hooks/queries/useProfiles";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { usePagination } from "../../../hooks/usePagination";
import { useNotify } from "../../../contexts/NotificationContext";
import { cn } from "../../../lib/cn";
import BackgroundCrop from "./BackgroundCrop";

const GAMES_PER_PAGE = 18;

interface BackgroundPickerProps {
    /** Your own: the games are yours, and so is what it wears now. */
    profile: Profile;
    onClose: () => void;
}

/** A game you've logged, then one of its pictures, then which part of it
 *  shows. */
const BackgroundPicker = ({ profile, onClose }: BackgroundPickerProps) => {
    const notify = useNotify();
    const [game, setGame] = useState<{ id: number; title: string } | null>(
        null
    );
    const [chosen, setChosen] = useState<string | null>(null);
    const [cropping, setCropping] = useState(false);
    const [position, setPosition] = useState(DEFAULT_BACKGROUND_POSITION);
    const [term, setTerm] = useState("");
    const [page, setPage] = useState(1);
    const q = useDebouncedValue(term.trim());

    const { data: shelf, isLoading: gamesLoading } = useUserShelf(
        profile.username,
        undefined,
        {
            page,
            limit: GAMES_PER_PAGE,
            sort: "played",
            direction: "desc",
            q: q || undefined,
        }
    );
    const { data: backdrops, isLoading: picturesLoading } = useGameBackdrops(
        game?.id
    );
    const save = useSetBackground();
    const clear = useClearBackground();

    const pagination = usePagination({
        total: shelf?.meta.total ?? 0,
        perPage: GAMES_PER_PAGE,
        page,
        onPageChange: setPage,
    });

    const pickGame = (next: { id: number; title: string }) => {
        setGame(next);
        // The one it wears now, if it came from this game.
        setChosen(
            profile.background?.gameId === next.id
                ? profile.background.url
                : null
        );
    };

    const pickPicture = (url: string) => {
        setChosen(url);
        // Back on the one it wears, where its owner last left it.
        setPosition(
            profile.background?.url === url
                ? profile.background.position
                : DEFAULT_BACKGROUND_POSITION
        );
        setCropping(true);
    };

    const onSave = async () => {
        if (!game || !chosen) return;
        try {
            await save.mutateAsync({ gameId: game.id, url: chosen, position });
            notify("Background updated", "success");
            onClose();
        } catch {
            notify("That didn't save, please try again", "error");
        }
    };

    const onRemove = async () => {
        try {
            await clear.mutateAsync();
            notify("Background removed", "success");
            onClose();
        } catch {
            notify("That didn't save, please try again", "error");
        }
    };

    const entries = shelf?.data ?? [];
    const busy = save.isPending || clear.isPending;

    return (
        <Modal
            onClose={onClose}
            labelledBy="background-picker-title"
            className="w-full max-w-2xl"
        >
            <div className="flex min-h-11 items-center gap-2 pr-10">
                {game && (
                    <button
                        type="button"
                        onClick={() =>
                            cropping ? setCropping(false) : setGame(null)
                        }
                        aria-label={
                            cropping
                                ? "Back to the pictures"
                                : "Back to your games"
                        }
                        className="relative -ml-1.5 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-content-secondary lift before:absolute before:-inset-1.5 before:content-[''] hover:bg-surface-hover hover:text-content focus-visible:outline-2 focus-visible:outline-brand"
                    >
                        <ChevronLeft size={18} aria-hidden />
                    </button>
                )}
                <h2
                    id="background-picker-title"
                    className="min-w-0 truncate font-display text-section text-content"
                >
                    {game ? game.title : "Profile background"}
                </h2>
            </div>
            <p className="mt-1 text-body-sm text-content-secondary">
                {!game
                    ? "Choose from a game you've logged."
                    : cropping
                      ? "Move the outline over the part to show on your profile."
                      : "Pick a picture to put across the top of your profile."}
            </p>

            <div className="mt-4">
                {game && cropping && chosen ? (
                    <BackgroundCrop
                        url={chosen}
                        position={position}
                        onChange={setPosition}
                    />
                ) : game ? (
                    picturesLoading ? (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {Array.from({ length: 6 }, (_, i) => (
                                <Skeleton
                                    key={i}
                                    className="aspect-video rounded-sm"
                                />
                            ))}
                        </div>
                    ) : !backdrops?.length ? (
                        <p className="py-8 text-center text-body-sm text-content-muted">
                            There are no pictures for this game yet.
                        </p>
                    ) : (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {backdrops.map((backdrop, i) => {
                                const selected = backdrop.url === chosen;
                                return (
                                    <button
                                        key={backdrop.url}
                                        type="button"
                                        aria-pressed={selected}
                                        aria-label={`Picture ${i + 1}`}
                                        onClick={() =>
                                            pickPicture(backdrop.url)
                                        }
                                        className={cn(
                                            "relative aspect-video cursor-pointer overflow-hidden rounded-sm bg-surface-sunken lift",
                                            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                                            selected
                                                ? "ring-2 ring-brand ring-offset-2 ring-offset-surface-raised"
                                                : "hover:opacity-90"
                                        )}
                                    >
                                        <img
                                            src={backdrop.thumbUrl}
                                            alt=""
                                            loading="lazy"
                                            className="size-full object-cover"
                                        />
                                        {selected && (
                                            <span className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-brand text-content-on-solid">
                                                <Check size={14} aria-hidden />
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )
                ) : (
                    <>
                        <Input
                            type="search"
                            value={term}
                            onChange={(e) => {
                                setTerm(e.target.value);
                                setPage(1);
                            }}
                            placeholder="Search your games"
                            aria-label="Search your games"
                        />
                        <div className="mt-3">
                            {gamesLoading ? (
                                <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                                    {Array.from({ length: 12 }, (_, i) => (
                                        <Skeleton
                                            key={i}
                                            className="aspect-3/4 rounded-xs"
                                        />
                                    ))}
                                </div>
                            ) : entries.length === 0 ? (
                                <div className="flex flex-col items-center gap-3 py-8 text-center">
                                    <p className="text-body-sm text-content-muted">
                                        {q
                                            ? `None of your games match "${q}".`
                                            : "Log a game and its pictures can go here."}
                                    </p>
                                    {!q && (
                                        <Link
                                            to="/library"
                                            onClick={onClose}
                                            className={buttonClass(
                                                "secondary",
                                                "min-h-11 sm:min-h-9",
                                                "sm"
                                            )}
                                        >
                                            Find a game to log
                                        </Link>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                                    {entries.map((entry) => {
                                        const title =
                                            entry.game?.title ?? "Unknown game";
                                        return (
                                            <button
                                                key={entry.gameId}
                                                type="button"
                                                onClick={() =>
                                                    pickGame({
                                                        id: entry.gameId,
                                                        title,
                                                    })
                                                }
                                                className="group flex min-w-0 cursor-pointer flex-col gap-1.5 rounded-xs text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                                            >
                                                <GameCover
                                                    coverUrl={
                                                        entry.game?.coverUrl ??
                                                        null
                                                    }
                                                    title={title}
                                                    className="aspect-3/4 w-full overflow-hidden rounded-xs shadow-cover lift group-hover:-translate-y-0.5"
                                                />
                                                <span className="line-clamp-2 text-label-sm text-content-secondary group-hover:text-content">
                                                    {title}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        {pagination.pageCount > 1 && (
                            <div className="mt-3 flex justify-center">
                                <Pagination pagination={pagination} />
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 border-t border-subtle pt-4 sm:flex-row sm:items-center sm:justify-between">
                {profile.background ? (
                    <Button
                        variant="ghost"
                        onClick={() => void onRemove()}
                        disabled={busy}
                        className="w-full sm:w-auto"
                    >
                        Remove background
                    </Button>
                ) : (
                    <span />
                )}
                {cropping && (
                    <Button
                        onClick={() => void onSave()}
                        disabled={busy}
                        className="w-full sm:w-auto"
                    >
                        {save.isPending ? "Saving…" : "Use this picture"}
                    </Button>
                )}
            </div>
        </Modal>
    );
};

export default BackgroundPicker;

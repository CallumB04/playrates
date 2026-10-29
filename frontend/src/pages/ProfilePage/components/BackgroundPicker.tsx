import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronLeft, Lock } from "lucide-react";
import {
    BACKGROUND_LEVEL,
    DEFAULT_BACKGROUND_POSITION,
    backgroundPrice,
    type Profile,
} from "@playrates/shared";
import { ApiError } from "../../../api";
import Modal from "../../../components/ui/Modal";
import Button, { buttonClass } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import Pagination from "../../../components/ui/Pagination";
import GameCover from "../../../components/game/GameCover";
import { Skeleton } from "../../../components/ui/Skeleton";
import SegmentedChoice from "../../../components/ui/SegmentedChoice";
import { TokenCoin } from "../../../components/progress/TokenAmount";
import {
    useBackgrounds,
    useBuyBackground,
} from "../../../hooks/queries/useProgress";
import { formatCount } from "../../../lib/format";
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

type Tab = "yours" | "more";

/**
 * Your pictures by game, or more from the games you've logged; then one
 * picture, then which part of it shows. A picture is bought once, the first
 * free, and each after it from the same game costs a little more.
 */
const BackgroundPicker = ({ profile, onClose }: BackgroundPickerProps) => {
    const notify = useNotify();
    const { data: owned, isLoading: ownedLoading } = useBackgrounds();
    const [tab, setTab] = useState<Tab | null>(null);
    const [game, setGame] = useState<{ id: number; title: string } | null>(
        null
    );
    const [chosen, setChosen] = useState<string | null>(null);
    const [cropping, setCropping] = useState(false);
    const [position, setPosition] = useState(DEFAULT_BACKGROUND_POSITION);
    const [term, setTerm] = useState("");
    const [page, setPage] = useState(1);
    const q = useDebouncedValue(term.trim());

    // Your own first, once there are some to show.
    const shownTab: Tab =
        tab ?? ((owned?.games.length ?? 0) > 0 ? "yours" : "more");

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
    const buy = useBuyBackground();

    const pagination = usePagination({
        total: shelf?.meta.total ?? 0,
        perPage: GAMES_PER_PAGE,
        page,
        onPageChange: setPage,
    });

    const ownedUrls = new Set(
        owned?.games.find((g) => g.gameId === game?.id)?.urls ?? []
    );
    const free = (owned?.credits ?? 0) > 0;
    const price = backgroundPrice(ownedUrls.size);
    const tokens = owned?.tokens ?? 0;

    const pickGame = (next: { id: number; title: string }) => {
        setGame(next);
        // The one it wears now, if it came from this game.
        setChosen(
            profile.background?.gameId === next.id
                ? profile.background.url
                : null
        );
    };

    const crop = (url: string) => {
        setChosen(url);
        // Back on the one it wears, where its owner last left it.
        setPosition(
            profile.background?.url === url
                ? profile.background.position
                : DEFAULT_BACKGROUND_POSITION
        );
        setCropping(true);
    };

    // Cropped before it's bought, and bought and worn in one press: closing
    // half way through spends nothing.
    const pickPicture = crop;

    const onBuy = async () => {
        if (!game || !chosen) return;
        try {
            await buy.mutateAsync({ gameId: game.id, url: chosen });
        } catch (error) {
            notify(
                error instanceof ApiError
                    ? error.message
                    : "Couldn't buy that picture",
                "error"
            );
            return;
        }
        await onSave();
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
    const busy = save.isPending || clear.isPending || buy.isPending;
    const buying = !!chosen && cropping && !ownedUrls.has(chosen);

    if (owned && !owned.unlocked) {
        return (
            <Modal
                onClose={onClose}
                labelledBy="background-picker-title"
                className="w-full max-w-md"
            >
                <div className="flex flex-col items-center py-4 text-center">
                    <span className="grid size-14 place-items-center rounded-md bg-surface-sunken text-content-muted">
                        <Lock size={24} aria-hidden />
                    </span>
                    <h2
                        id="background-picker-title"
                        className="mt-4 font-display text-section text-content"
                    >
                        Backgrounds open at level {BACKGROUND_LEVEL}
                    </h2>
                    <p className="mt-1 max-w-xs text-body-sm text-content-secondary">
                        You’re level {profile.level}. Your first picture is free
                        when you get there.
                    </p>
                    <Link
                        to="/progress"
                        onClick={onClose}
                        className={buttonClass(
                            "secondary",
                            "mt-5 w-full sm:w-auto",
                            "touch"
                        )}
                    >
                        See how to level up
                    </Link>
                </div>
            </Modal>
        );
    }

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
                        className="relative -ml-1.5 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-sm text-content-secondary lift before:absolute before:-inset-1.5 before:content-[''] hover:bg-surface-hover hover:text-content focus-visible:outline-2 focus-visible:outline-brand"
                    >
                        <ChevronLeft size={18} aria-hidden />
                    </button>
                )}
                <h2
                    id="background-picker-title"
                    className="min-w-0 flex-1 truncate font-display text-section text-content"
                >
                    {game ? game.title : "Profile background"}
                </h2>
                {owned && (
                    <span className="inline-flex shrink-0 items-center gap-1.5 font-mono text-label-sm text-content-secondary tabular-nums">
                        {free ? (
                            "1 free picture"
                        ) : (
                            <>
                                <TokenCoin className="size-3.5" />
                                {formatCount(tokens)}
                            </>
                        )}
                    </span>
                )}
            </div>
            <p className="mt-1 text-body-sm text-content-secondary">
                {!game
                    ? shownTab === "yours"
                        ? "Your pictures, by game."
                        : "Choose from a game you've logged."
                    : cropping
                      ? "Move the outline over the part to show on your profile."
                      : "Pick a picture to put across the top of your profile."}
            </p>

            {!game && (
                <SegmentedChoice
                    label="Which pictures"
                    segments={[
                        { value: "yours", label: "Yours" },
                        { value: "more", label: "Get more" },
                    ]}
                    value={shownTab}
                    onChange={setTab}
                    fill
                    className="mt-4 sm:max-w-xs"
                />
            )}

            <div className="mt-4">
                {game && cropping && chosen ? (
                    <BackgroundCrop
                        url={chosen}
                        position={position}
                        onChange={setPosition}
                    />
                ) : game ? (
                    picturesLoading || ownedLoading ? (
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
                                const mine = ownedUrls.has(backdrop.url);
                                return (
                                    <button
                                        key={backdrop.url}
                                        type="button"
                                        aria-pressed={selected}
                                        aria-label={`Picture ${i + 1}${mine ? "" : free ? ", free" : `, ${price} tokens`}`}
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
                                        {!mine && (
                                            <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-media-scrim-strong px-2 py-0.5 font-mono text-label-sm font-semibold text-content-on-media">
                                                {free ? (
                                                    "Free"
                                                ) : (
                                                    <>
                                                        <TokenCoin className="size-3" />
                                                        {price}
                                                    </>
                                                )}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )
                ) : shownTab === "yours" ? (
                    ownedLoading ? (
                        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                            {Array.from({ length: 6 }, (_, i) => (
                                <Skeleton
                                    key={i}
                                    className="aspect-3/4 rounded-xs"
                                />
                            ))}
                        </div>
                    ) : !owned?.games.length ? (
                        <div className="flex flex-col items-center gap-3 py-8 text-center">
                            <p className="text-body-sm text-content-muted">
                                {free
                                    ? "Your first picture is free. Pick one from a game you've logged."
                                    : "Pictures you get show here, by game."}
                            </p>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setTab("more")}
                                className="min-h-11 sm:min-h-9"
                            >
                                Get a picture
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                            {owned.games.map((g) => (
                                <GameButton
                                    key={g.gameId}
                                    title={g.title}
                                    coverUrl={g.coverUrl}
                                    note={`${g.urls.length} ${g.urls.length === 1 ? "picture" : "pictures"}`}
                                    onClick={() =>
                                        pickGame({
                                            id: g.gameId,
                                            title: g.title,
                                        })
                                    }
                                />
                            ))}
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
                                            <GameButton
                                                key={entry.gameId}
                                                title={title}
                                                coverUrl={
                                                    entry.game?.coverUrl ?? null
                                                }
                                                onClick={() =>
                                                    pickGame({
                                                        id: entry.gameId,
                                                        title,
                                                    })
                                                }
                                            />
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
                {buying && (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                        {!free && (
                            <span className="text-center font-mono text-label-sm text-content-muted tabular-nums sm:text-right">
                                {tokens >= price
                                    ? `${formatCount(tokens - price)} left after`
                                    : `${formatCount(price - tokens)} more tokens needed`}
                            </span>
                        )}
                        <Button
                            onClick={() => void onBuy()}
                            disabled={busy || (!free && tokens < price)}
                            className="w-full sm:w-auto"
                        >
                            {free ? (
                                "Use your free picture"
                            ) : (
                                <>
                                    Buy for
                                    <TokenCoin className="size-4" />
                                    {price}
                                </>
                            )}
                        </Button>
                    </div>
                )}
                {cropping && !buying && (
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

/** A game's cover, to open its pictures. */
const GameButton = ({
    title,
    coverUrl,
    note,
    onClick,
}: {
    title: string;
    coverUrl: string | null;
    note?: string;
    onClick: () => void;
}) => (
    <button
        type="button"
        onClick={onClick}
        className="group flex min-w-0 cursor-pointer flex-col gap-1.5 rounded-xs text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
        <GameCover
            coverUrl={coverUrl}
            title={title}
            className="aspect-3/4 w-full overflow-hidden rounded-xs shadow-cover lift group-hover:-translate-y-0.5"
        />
        <span className="line-clamp-2 text-label-sm text-content-secondary group-hover:text-content">
            {title}
        </span>
        {note && (
            <span className="-mt-1 text-[11px] text-content-muted">{note}</span>
        )}
    </button>
);

export default BackgroundPicker;

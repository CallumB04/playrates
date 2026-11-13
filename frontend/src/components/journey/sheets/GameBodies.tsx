import { useState } from "react";
import { Plus, X } from "lucide-react";
import { MAX_FAVOURITE_GAMES } from "@playrates/shared";
import GamePicker, { type PickedGame } from "../../community/GamePicker";
import GameCover from "../../game/GameCover";
import Button from "../../ui/Button";
import Field from "../../ui/Field";
import { Textarea } from "../../ui/Input";
import SegmentedChoice from "../../ui/SegmentedChoice";
import Skeleton from "../../ui/Skeleton";
import { logOnShelf } from "../../../api";
import { useAuth } from "../../../contexts/AuthContext";
import { useNotify } from "../../../contexts/NotificationContext";
import {
    useUserFavourites,
    useSetFavourites,
} from "../../../hooks/queries/useFavourites";
import {
    useLogMutations,
    useMyShelf,
} from "../../../hooks/queries/useGameLogs";
import { openSetupStep } from "../../../lib/setupSheet";
import { cn } from "../../../lib/cn";
import { rankTone } from "../../../pages/ProfilePage/lib/about";
import RateRows from "../RateRows";
import SheetActions from "./SheetActions";
import { useSlotDrag } from "./useSlotDrag";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import {
    filled,
    nextEmpty,
    placeIn,
    swapSlots,
    toSlots,
    type Slots,
} from "./favouriteSlots";
import type { SheetBodyProps } from "./sheetProps";

type Shelf = "played" | "playing";
const SHELVES = [
    { value: "played" as const, label: "Played" },
    { value: "playing" as const, label: "Playing" },
];

export const LogBody = ({ onDone, onSkip }: SheetBodyProps) => {
    const [game, setGame] = useState<PickedGame | null>(null);
    const [shelf, setShelf] = useState<Shelf>("played");
    const { create } = useLogMutations();
    const notify = useNotify();

    const add = async () => {
        if (!game) return;
        try {
            await create.mutateAsync({ gameId: game.id, status: shelf });
            onDone();
        } catch {
            notify("Couldn’t add that. Try again.", "error");
        }
    };

    return (
        <>
            <Field label="Game">
                {(a11y) => (
                    <GamePicker
                        {...a11y}
                        value={game}
                        onChange={setGame}
                        placeholder="Search for a game you’ve played"
                        inlineResults
                        autoFocus
                    />
                )}
            </Field>
            <SegmentedChoice
                label="Which shelf"
                segments={SHELVES}
                value={shelf}
                onChange={setShelf}
                fill
            />
            <SheetActions onSkip={onSkip}>
                <Button
                    onClick={() => void add()}
                    disabled={!game || create.isPending}
                    className="w-full sm:w-auto"
                >
                    {create.isPending ? "Adding…" : "Add it"}
                </Button>
            </SheetActions>
        </>
    );
};

/** Nothing of theirs to work with yet: a game to log first. */
const NeedsAGame = ({ onSkip }: { onSkip: () => void }) => (
    <>
        <p className="rounded-md border border-dashed border-strong p-4 text-body-sm text-content-secondary">
            Add a game you’ve played first, then come back to this.
        </p>
        <SheetActions onSkip={onSkip}>
            <Button
                onClick={() => openSetupStep("log")}
                className="w-full sm:w-auto"
            >
                Add a game
            </Button>
        </SheetActions>
    </>
);

export const RateBody = ({ onDone, onSkip }: SheetBodyProps) => {
    const [empty, setEmpty] = useState(false);
    const [rated, setRated] = useState(0);
    if (empty) return <NeedsAGame onSkip={onSkip} />;
    return (
        <>
            <RateRows onRated={setRated} onEmpty={() => setEmpty(true)} />
            <SheetActions onSkip={onSkip}>
                <Button
                    onClick={onDone}
                    disabled={rated === 0}
                    className="w-full sm:w-auto"
                >
                    Done
                </Button>
            </SheetActions>
        </>
    );
};

export const ReviewBody = ({ onDone, onSkip }: SheetBodyProps) => {
    const { data, isPending } = useMyShelf("played", { limit: 12 });
    const logs = (data?.data ?? []).flatMap((entry) => {
        const log = logOnShelf(entry, "played");
        return log?.game ? [log] : [];
    });
    const [chosen, setChosen] = useState<number | null>(null);
    const log = logs.find((l) => l.id === chosen) ?? logs[0];
    const [body, setBody] = useState("");
    const { saveReview } = useLogMutations();
    const notify = useNotify();

    if (isPending) return <Skeleton className="h-40 w-full rounded-md" />;
    if (!log) return <NeedsAGame onSkip={onSkip} />;

    const post = async () => {
        try {
            await saveReview.mutateAsync({
                logId: log.id,
                // Public and spoiler-free, as the log editor starts one.
                input: {
                    body: body.trim(),
                    isPublic: true,
                    containsSpoilers: false,
                },
            });
            onDone();
        } catch {
            notify("Couldn’t post that. Try again.", "error");
        }
    };

    return (
        <>
            {/* The games they've played, the first picked for them. */}
            <div
                role="radiogroup"
                aria-label="Which game"
                // Room round it for the chosen one's ring, which the scroll
                // would otherwise clip.
                className="-m-1.5 flex [scrollbar-width:none] gap-2 overflow-x-auto p-1.5"
            >
                {logs.slice(0, 8).map((l) => (
                    <button
                        key={l.id}
                        type="button"
                        role="radio"
                        aria-checked={l.id === log.id}
                        aria-label={l.game!.title}
                        onClick={() => setChosen(l.id)}
                        className={cn(
                            "w-14 shrink-0 cursor-pointer overflow-hidden rounded-xs transition-opacity",
                            l.id === log.id
                                ? "ring-2 ring-brand ring-offset-2 ring-offset-surface-raised"
                                : "opacity-60 hover:opacity-100"
                        )}
                    >
                        <GameCover
                            coverUrl={l.game!.coverUrl}
                            title={l.game!.title}
                            className="aspect-3/4 w-full"
                        />
                    </button>
                ))}
            </div>
            <Field label={`Your review of ${log.game!.title}`}>
                {(a11y) => (
                    <Textarea
                        {...a11y}
                        rows={4}
                        value={body}
                        maxLength={5000}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder="What did you think?"
                    />
                )}
            </Field>
            <SheetActions onSkip={onSkip}>
                <Button
                    onClick={() => void post()}
                    disabled={!body.trim() || saveReview.isPending}
                    className="w-full sm:w-auto"
                >
                    {saveReview.isPending ? "Posting…" : "Post review"}
                </Button>
            </SheetActions>
        </>
    );
};

/**
 * Six places, each filled on its own: tap one and the search fills it.
 * Drag one cover onto another to trade them, which moves a game into an
 * empty place: straight away with a mouse, after a moment's hold by
 * finger, so a swipe still scrolls.
 */
export const FavouritesBody = ({ onDone, onSkip }: SheetBodyProps) => {
    const user = useAuth().user!;
    const { data: current } = useUserFavourites(user.username);
    const [slots, setSlots] = useState<Slots<PickedGame> | null>(null);
    if (slots === null && current)
        setSlots(toSlots<PickedGame>(current, MAX_FAVOURITE_GAMES));
    const places = slots ?? toSlots<PickedGame>([], MAX_FAVOURITE_GAMES);
    // The place the search fills: the one tapped, or the first gap. With
    // all six filled and none tapped, nowhere, and the search waits.
    const [chosen, setChosen] = useState<number | null>(null);
    const firstGap = places.indexOf(null);
    const target = chosen ?? (firstGap < 0 ? null : firstGap);
    const { drag, start, consumeDrag } = useSlotDrag((from, to) => {
        setSlots(swapSlots(places, from, to));
    });
    const touch = useMediaQuery("(pointer: coarse)");
    const setFavourites = useSetFavourites();
    const notify = useNotify();
    const games = filled(places);
    const gaps = places.slice(0, games.length).includes(null);
    const lifted = drag ? places[drag.from] : null;

    const put = (game: PickedGame | null) => {
        if (!game || target === null) return;
        const next = placeIn(places, target, game);
        setSlots(next);
        // On to the next gap, so a run of picks fills them in turn.
        setChosen(next.includes(null) ? nextEmpty(next, target) : null);
    };

    const save = async () => {
        try {
            await setFavourites.mutateAsync(games.map((g) => g.id));
            onDone();
        } catch {
            notify("Couldn’t save those. Try again.", "error");
        }
    };

    return (
        <>
            {/* Ranked as the profile shows them: gold, silver, bronze. */}
            <ol className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
                {places.map((game, i) => {
                    const on = i === target;
                    return (
                        <li key={i} data-slot={i}>
                            <span
                                aria-hidden
                                className={cn(
                                    "mb-1.5 block font-mono text-label font-semibold tabular-nums",
                                    game
                                        ? rankTone(i + 1)
                                        : "text-content-muted/50"
                                )}
                            >
                                #{i + 1}
                            </span>
                            <div className="relative">
                                <button
                                    type="button"
                                    aria-pressed={on}
                                    aria-label={
                                        game
                                            ? `Number ${i + 1}: ${game.title}`
                                            : `Number ${i + 1}: empty`
                                    }
                                    onPointerDown={(e) => game && start(i, e)}
                                    onContextMenu={(e) => e.preventDefault()}
                                    onClick={() => {
                                        if (!consumeDrag()) setChosen(i);
                                    }}
                                    className={cn(
                                        "block w-full cursor-pointer touch-manipulation rounded-xs transition-[box-shadow,opacity] duration-150 select-none [-webkit-touch-callout:none]",
                                        // Quiet: which one the search
                                        // fills, not a selection to act on.
                                        on &&
                                            !drag &&
                                            "ring-1 ring-brand/60 ring-offset-2 ring-offset-surface-raised",
                                        drag?.from === i && "opacity-30",
                                        drag &&
                                            drag.over === i &&
                                            drag.from !== i &&
                                            "ring-2 ring-brand ring-offset-2 ring-offset-surface-raised",
                                        game &&
                                            "cursor-grab active:cursor-grabbing"
                                    )}
                                >
                                    {game ? (
                                        <GameCover
                                            coverUrl={game.coverUrl}
                                            title={game.title}
                                            className="pointer-events-none aspect-3/4 w-full overflow-hidden rounded-xs"
                                        />
                                    ) : (
                                        <span
                                            className={cn(
                                                "grid aspect-3/4 w-full place-items-center rounded-xs border border-dashed transition-colors",
                                                on
                                                    ? "border-brand/60 text-brand-text"
                                                    : "border-strong text-content-muted hover:border-brand/60 hover:text-brand-text"
                                            )}
                                        >
                                            <Plus size={18} aria-hidden />
                                        </span>
                                    )}
                                </button>
                                {game && (
                                    <button
                                        type="button"
                                        aria-label={`Take off ${game.title}`}
                                        onClick={() => {
                                            setSlots(
                                                places.map((s, j) =>
                                                    j === i ? null : s
                                                )
                                            );
                                            setChosen(i);
                                        }}
                                        // The site's own way to take something off: a quiet chip that
                                        // turns to the danger tint, as Log out does.
                                        className="absolute top-1 right-1 grid size-6 cursor-pointer place-items-center rounded-xs border border-subtle bg-surface-raised/90 text-content-secondary shadow-lip transition-colors lift before:absolute before:-inset-2 before:content-[''] hover:border-danger-border hover:bg-danger-subtle hover:text-danger focus-visible:text-danger"
                                    >
                                        <X size={13} aria-hidden />
                                    </button>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ol>
            <p className="-mt-2 text-label-sm text-content-muted">
                {firstGap >= 0 &&
                    (touch
                        ? "Tap a spot to fill it. "
                        : "Click a spot to fill it. ")}
                {touch ? "Hold and drag to reorder." : "Drag to reorder."}
                {gaps && " Empty spots close up when you save."}
            </p>
            {/* The cover in hand, under the pointer. */}
            {drag && lifted && (
                <span
                    aria-hidden
                    className="pointer-events-none fixed z-[80] w-20 -translate-x-1/2 -translate-y-1/2 rotate-3 drop-shadow-xl"
                    style={{ left: drag.x, top: drag.y }}
                >
                    <GameCover
                        coverUrl={lifted.coverUrl}
                        title={lifted.title}
                        className="aspect-3/4 w-full overflow-hidden rounded-xs ring-2 ring-brand"
                    />
                </span>
            )}
            <Field
                label={
                    target === null
                        ? "Change a game"
                        : `Game for #${target + 1}`
                }
            >
                {(a11y) => (
                    <GamePicker
                        {...a11y}
                        // Cleared after each pick, ready for the next.
                        value={null}
                        onChange={put}
                        // Already in the six: not offered twice.
                        exclude={games.map((g) => g.id)}
                        disabled={target === null}
                        placeholder={
                            target !== null
                                ? "Search for a favourite"
                                : touch
                                  ? "Tap a game above to change it"
                                  : "Click a game above to change it"
                        }
                        inlineResults
                    />
                )}
            </Field>
            <SheetActions onSkip={onSkip}>
                <Button
                    onClick={() => void save()}
                    disabled={games.length === 0 || setFavourites.isPending}
                    className="w-full sm:w-auto"
                >
                    {setFavourites.isPending ? "Saving…" : "Save favourites"}
                </Button>
            </SheetActions>
        </>
    );
};

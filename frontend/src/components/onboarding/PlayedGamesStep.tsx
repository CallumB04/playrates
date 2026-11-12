import { useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useSteamAvailable } from "../steam/useSteamAvailable";
import { Check } from "lucide-react";
import PlayGlyph from "../ui/PlayGlyph";
import { STATUS_PRESENTATION } from "../../constants/gameStatus";
import type { Game } from "@playrates/shared";
import Button from "../ui/Button";
import { Skeleton } from "../ui/Skeleton";
import GameCover from "../game/GameCover";
import LoadingSpinner from "../LoadingSpinner";
import { queryKeys, type GameListFilters } from "../../api";
import { useCatalogueReach, useGames } from "../../hooks/queries/useGames";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useDismiss } from "../../hooks/useDismiss";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { Input } from "../ui/Input";
import { useLogMutations } from "../../hooks/queries/useGameLogs";
import { useNotify } from "../../contexts/NotificationContext";
import { formatCount } from "../../lib/format";
import { cn } from "../../lib/cn";

const SHOWN = 12;

/** Whether the screen is worked by a finger: no hover, and a toggle on a
 *  cover too small to hit well. */
const TOUCH = "(pointer: coarse)";

type Shelf = "played" | "playing";

// The choices on a cover by finger. Whole class names, so the stylesheet
// keeps them; dark in both themes, over the dimmed art.
const OPTION =
    "flex h-7 w-full cursor-pointer items-center justify-center gap-1 rounded-xs border bg-surface-media/80 text-[11px] leading-none font-semibold transition-colors";
const CHOSEN: Record<Shelf, string> = {
    played: cn("border-brand", STATUS_PRESENTATION.played.onMediaTone),
    playing: cn(
        "border-status-playing",
        STATUS_PRESENTATION.playing.onMediaTone
    ),
};

/**
 * A cover to tap, ringed and ticked once picked. Whether it's on the go is
 * asked of the games picked, where they were picked: with a mouse, by a
 * Playing switch at the foot of the cover; by a finger, tapping a picked
 * cover again opens its choices on the cover itself, as the switch is too
 * small to hit and a hold too easy to miss.
 */
const CoverPick = ({
    game,
    on,
    playing,
    touch,
    choosing,
    onTap,
    onPlaying,
    onChoose,
    onClose,
}: {
    game: Game;
    on: boolean;
    playing: boolean;
    touch: boolean;
    choosing: boolean;
    onTap: () => void;
    onPlaying: () => void;
    onChoose: (shelf: Shelf | null) => void;
    onClose: () => void;
}) => {
    const box = useRef<HTMLDivElement>(null);
    useDismiss([box], onClose, { enabled: choosing, escape: true });
    const shelf: Shelf = playing ? "playing" : "played";

    return (
        <div
            ref={box}
            className={cn(
                "relative rounded-sm lift",
                on &&
                    cn(
                        "ring-2 ring-offset-2 ring-offset-surface-raised",
                        playing ? "ring-status-playing" : "ring-brand"
                    )
            )}
        >
            <button
                type="button"
                aria-pressed={on}
                aria-expanded={touch && on ? choosing : undefined}
                aria-label={game.title}
                onClick={choosing ? onClose : onTap}
                className="block w-full cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
                <GameCover
                    coverUrl={game.coverUrl}
                    title={game.title}
                    className={cn(
                        "aspect-3/4 w-full overflow-hidden rounded-sm transition-[filter] duration-200",
                        choosing && "brightness-[0.35]"
                    )}
                />
            </button>
            {choosing ? (
                <div
                    role="group"
                    aria-label={`Where ${game.title} goes`}
                    className="absolute inset-0 flex animate-fade-up flex-col justify-center gap-1 p-1.5"
                >
                    {(["played", "playing"] as const).map((option) => (
                        <button
                            key={option}
                            type="button"
                            aria-pressed={shelf === option}
                            onClick={() => onChoose(option)}
                            className={cn(
                                OPTION,
                                shelf === option
                                    ? CHOSEN[option]
                                    : "border-transparent text-content-on-media"
                            )}
                        >
                            {option === "playing" ? (
                                <PlayGlyph size={10} />
                            ) : (
                                <Check size={11} strokeWidth={3} />
                            )}
                            {option === "playing" ? "Playing" : "Played"}
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={() => onChoose(null)}
                        className={cn(
                            OPTION,
                            "border-transparent bg-transparent text-content-on-media/75"
                        )}
                    >
                        Remove
                    </button>
                </div>
            ) : (
                on && (
                    <>
                        <span
                            aria-hidden
                            className={cn(
                                "pointer-events-none absolute top-1.5 right-1.5 grid size-6 animate-stamp place-items-center rounded-xs text-content-on-solid shadow-solid",
                                playing ? "bg-status-playing" : "bg-brand"
                            )}
                        >
                            {playing ? (
                                <PlayGlyph size={12} />
                            ) : (
                                <Check size={14} strokeWidth={3} />
                            )}
                        </span>
                        {touch ? (
                            playing && (
                                // The label alone: a tap on it is a tap on
                                // the cover, which opens the choices.
                                <span
                                    aria-hidden
                                    className={cn(
                                        "pointer-events-none absolute inset-x-1.5 bottom-1.5 flex h-6 items-center justify-center gap-1 rounded-xs border bg-surface-media/85 text-[11px] leading-none font-semibold",
                                        CHOSEN.playing
                                    )}
                                >
                                    <PlayGlyph size={10} />
                                    Playing
                                </span>
                            )
                        ) : (
                            <button
                                type="button"
                                aria-pressed={playing}
                                aria-label={`Playing ${game.title} now`}
                                onClick={onPlaying}
                                className={cn(
                                    // Small to see, with room round it to hit.
                                    "absolute inset-x-1.5 bottom-1.5 flex h-6 animate-fade-up cursor-pointer items-center justify-center gap-1 rounded-xs border bg-surface-media/85 text-[11px] leading-none font-semibold backdrop-blur-sm transition-colors before:absolute before:-inset-x-1.5 before:-inset-y-2.5 before:content-['']",
                                    playing
                                        ? CHOSEN.playing
                                        : "border-transparent text-content-on-media hover:bg-surface-media"
                                )}
                            >
                                <PlayGlyph size={10} />
                                {playing ? "Playing" : "Playing?"}
                            </button>
                        )}
                    </>
                )
            )}
        </div>
    );
};

/** Held at the foot as the covers scroll, with what's picked so far beside
 *  the way on. */
const Footer = ({
    summary,
    children,
}: {
    summary: string;
    children: ReactNode;
}) => (
    <div className="sticky bottom-0 -mx-4 -mb-4 flex flex-col gap-2 border-t border-subtle bg-surface-raised px-4 py-3 sm:-mx-6 sm:-mb-6 sm:flex-row sm:items-center sm:px-6 sm:py-4">
        <p
            aria-live="polite"
            className="text-label-sm text-content-muted max-sm:text-center sm:mr-auto"
        >
            {summary}
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {children}
        </div>
    </div>
);

/** One or two letters match too much to be worth asking about. */
const searchOf = (typed: string): string | undefined =>
    typed.length >= 2 ? typed : undefined;

const filtersFor = (typed: string): GameListFilters => ({
    sort: "logged",
    limit: SHOWN,
    count: false,
    search: searchOf(typed),
});

interface PlayedGamesStepProps {
    titleId: string;
    /** Walks it without logging a thing, for the admin preview. */
    preview?: boolean;
    onDone: () => void;
}

/**
 * The welcome's second step: the games most logged here, to tap the ones
 * already played, and mark any still on the go. An empty shelf is the hardest place to start, and these
 * are the likeliest to have been played.
 */
const PlayedGamesStep = ({
    titleId,
    preview = false,
    onDone,
}: PlayedGamesStepProps) => {
    /* The most logged to start with; a search for anything else. A pick
       stays picked as the search changes. */
    const [search, setSearch] = useState("");
    const typed = search.trim();
    const settled = useDebouncedValue(typed, 250);
    const queryClient = useQueryClient();
    // A search already made shows at once; only a new one waits for a pause.
    const made = queryClient.getQueryData(
        queryKeys.games.list({ ...filtersFor(typed) })
    );
    const term = made ? typed : settled;
    const { data, isLoading, isFetching, isPlaceholderData } = useGames(
        filtersFor(term)
    );
    /* Until what's shown is what was typed, the last search's covers would
       sit there looking like the answer. */
    const waiting =
        isLoading || isPlaceholderData || searchOf(typed) !== searchOf(term);

    /* The catalogue is checked first. Only nothing, or near misses, look
       further, as the library does: the game may simply not be here yet. */
    const answer = !waiting && searchOf(term) ? data : undefined;
    const none = answer?.data.length === 0;
    const closest = !!answer?.meta.approximate;
    const { reaching, found } = useCatalogueReach(term, none || closest);
    // Until the list has been asked again for what was just added.
    const lookingFurther = reaching || (found > 0 && isFetching);
    const { create } = useLogMutations();
    const steamAvailable = useSteamAvailable();
    const notify = useNotify();
    const touch = useMediaQuery(TOUCH);
    const [picked, setPicked] = useState<Game[]>([]);
    const [playing, setPlaying] = useState<number[]>([]);
    const [saving, setSaving] = useState(false);
    const has = (id: number) => picked.some((game) => game.id === id);

    const tapPlayed = (game: Game) => {
        if (has(game.id)) {
            setPicked((p) => p.filter((g) => g.id !== game.id));
            setPlaying((p) => p.filter((id) => id !== game.id));
        } else setPicked((p) => [...p, game]);
    };
    // The cover whose choices are open, by finger: one at a time.
    const [choosing, setChoosing] = useState<number | null>(null);
    const choose = (game: Game, shelf: Shelf | null) => {
        setChoosing(null);
        if (shelf === null) return tapPlayed(game);
        setPlaying((p) =>
            shelf === "playing"
                ? [...p.filter((id) => id !== game.id), game.id]
                : p.filter((id) => id !== game.id)
        );
    };
    const tapPlaying = (id: number) =>
        setPlaying((p) =>
            p.includes(id) ? p.filter((x) => x !== id) : [...p, id]
        );

    const add = async () => {
        if (preview) return onDone();
        setSaving(true);
        const results = await Promise.allSettled(
            picked.map((game) =>
                create.mutateAsync({
                    gameId: game.id,
                    status: playing.includes(game.id) ? "playing" : "played",
                })
            )
        );
        setSaving(false);
        const failed = results.filter((r) => r.status === "rejected").length;
        if (failed > 0)
            notify(
                `${formatCount(failed)} of those didn’t save. Add them from their pages.`,
                "error"
            );
        onDone();
    };

    const games = `${formatCount(picked.length)} ${picked.length === 1 ? "game" : "games"}`;

    /* Held to the popup's height, so only the covers scroll: the heading,
       the search and the way on stay in view. The popup's own padding and
       border come off the height it's allowed. */
    return (
        <div className="flex max-h-[calc(88dvh-2rem-1px)] flex-col gap-4 sm:max-h-[calc(90dvh-3rem-2px)]">
            <div className="pr-11 sm:pr-8">
                <h2
                    id={titleId}
                    className="font-display text-section text-content"
                >
                    Games you’ve played
                </h2>
                <p className="mt-1.5 text-body-sm text-content-secondary">
                    {touch
                        ? "Tap the ones you’ve played."
                        : "Tap the ones you’ve played. Still on one? Mark it as Playing."}
                </p>
            </div>

            {/* Said once, with the mark a cover on the go gets, as a
                second tap does something a first one doesn't. */}
            {touch && (
                <p className="-mt-1 flex items-center gap-2.5 rounded-sm border border-subtle bg-surface-sunken/60 px-3 py-2.5 text-body-sm text-content-secondary">
                    <span
                        aria-hidden
                        className="grid size-6 shrink-0 place-items-center rounded-xs bg-status-playing text-content-on-solid"
                    >
                        <PlayGlyph size={12} />
                    </span>
                    <span>
                        <strong className="font-semibold text-content">
                            Tap a game again
                        </strong>{" "}
                        to mark it as Playing.
                    </span>
                </p>
            )}

            <Input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search for a game"
                aria-label="Search for a game"
            />

            {steamAvailable && !preview && (
                <p className="text-body-sm text-content-secondary">
                    Got a Steam library?{" "}
                    <Link
                        to="/settings?section=content&import=steam"
                        onClick={onDone}
                        className="relative font-medium text-brand-text underline-offset-2 before:absolute before:-inset-x-1 before:-inset-y-3 before:content-[''] hover:underline"
                    >
                        Import it instead
                    </Link>
                </p>
            )}

            {none && lookingFurther && (
                <p
                    role="status"
                    className="flex items-center gap-2 text-body-sm text-content-secondary"
                >
                    <LoadingSpinner size="sm" label={null} />
                    Looking further for “{term}”…
                </p>
            )}

            {none && !lookingFurther && (
                <p className="text-body-sm text-content-secondary">
                    Nothing matches “{term}”.
                </p>
            )}

            {closest && (
                <p
                    role="status"
                    className="flex items-center gap-2 text-body-sm text-content-secondary"
                >
                    {lookingFurther && (
                        <LoadingSpinner size="sm" label="Searching" />
                    )}
                    Nothing is called “{term}”, so these are the closest titles.
                </p>
            )}

            <ul
                aria-busy={waiting}
                // Room round the edge for a picked cover's ring, which the
                // scroll would otherwise clip.
                className="-mx-1 grid min-h-0 flex-1 grid-cols-3 gap-2.5 overflow-y-auto overscroll-contain p-1 sm:grid-cols-4"
            >
                {waiting
                    ? Array.from({ length: SHOWN }, (_, i) => (
                          <li key={i}>
                              <Skeleton className="aspect-3/4 rounded-sm" />
                          </li>
                      ))
                    : (data?.data ?? []).map((game) => (
                          <li key={game.id}>
                              <CoverPick
                                  game={game}
                                  on={has(game.id)}
                                  playing={playing.includes(game.id)}
                                  onTap={() =>
                                      touch && has(game.id)
                                          ? setChoosing(game.id)
                                          : tapPlayed(game)
                                  }
                                  touch={touch}
                                  onPlaying={() => tapPlaying(game.id)}
                                  choosing={choosing === game.id}
                                  onChoose={(shelf) => choose(game, shelf)}
                                  onClose={() => setChoosing(null)}
                              />
                          </li>
                      ))}
            </ul>

            <Footer
                summary={
                    picked.length === 0
                        ? "Nothing picked yet"
                        : [
                              `${formatCount(picked.length - playing.length)} played`,
                              `${formatCount(playing.length)} playing`,
                          ]
                              .filter((part) => !part.startsWith("0 "))
                              .join(" · ")
                }
            >
                <Button
                    variant="ghost"
                    onClick={onDone}
                    disabled={saving}
                    className="w-full sm:w-auto"
                >
                    Skip for now
                </Button>
                <Button
                    onClick={() => void add()}
                    disabled={picked.length === 0 || saving}
                    className="w-full sm:w-auto"
                >
                    {saving
                        ? "Adding…"
                        : picked.length === 0
                          ? "Add to my shelves"
                          : `Add ${games}`}
                </Button>
            </Footer>
        </div>
    );
};

export default PlayedGamesStep;

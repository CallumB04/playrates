import { useState, type ReactNode } from "react";
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
import { useLongPress } from "../../hooks/useLongPress";
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

/**
 * A cover to tap, ringed and ticked once picked. Whether it's on the go is
 * asked of the games picked, where they were picked: with a mouse, by a
 * Playing switch at the foot of the cover; by a finger, by holding the
 * cover down. The switch stays for a screen reader on a touch screen.
 */
const CoverPick = ({
    game,
    on,
    playing,
    touch,
    onTap,
    onPlaying,
    onHold,
}: {
    game: Game;
    on: boolean;
    playing: boolean;
    touch: boolean;
    onTap: () => void;
    onPlaying: () => void;
    onHold: () => void;
}) => {
    const hold = useLongPress(onHold);
    return (
        <div
            className={cn(
                "relative rounded-sm transition-transform duration-150 lift",
                hold.pressing && "scale-[0.96]",
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
                aria-label={game.title}
                onClick={() => {
                    if (!hold.consumeHold()) onTap();
                }}
                {...hold.handlers}
                className="block w-full cursor-pointer touch-manipulation rounded-sm select-none [-webkit-touch-callout:none] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
                <GameCover
                    coverUrl={game.coverUrl}
                    title={game.title}
                    className="pointer-events-none aspect-3/4 w-full overflow-hidden rounded-sm"
                />
            </button>
            {on && (
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
                    <button
                        type="button"
                        aria-pressed={playing}
                        aria-label={`Playing ${game.title} now`}
                        onClick={onPlaying}
                        className={cn(
                            // Small to see, with room round it to hit.
                            "absolute inset-x-1.5 bottom-1.5 flex h-6 animate-fade-up cursor-pointer items-center justify-center gap-1 rounded-xs border bg-surface-media/85 text-[11px] leading-none font-semibold backdrop-blur-sm transition-colors before:absolute before:-inset-x-1.5 before:-inset-y-2.5 before:content-['']",
                            playing
                                ? cn(
                                      "border-status-playing",
                                      STATUS_PRESENTATION.playing.onMediaTone
                                  )
                                : "border-transparent text-content-on-media hover:bg-surface-media",
                            // By finger it's held, not hit: shown only as
                            // the label once playing, and a tap on it is a
                            // tap on the cover.
                            touch &&
                                (playing ? "pointer-events-none" : "sr-only")
                        )}
                    >
                        <PlayGlyph size={10} />
                        {playing ? "Playing" : "Playing?"}
                    </button>
                </>
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
    // Held: picked if it wasn't, and on the go, or back to played.
    const holdPlaying = (game: Game) => {
        if (!has(game.id)) setPicked((p) => [...p, game]);
        tapPlaying(game.id);
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

    return (
        <div className="flex flex-col gap-4">
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

            {/* A hold can't be seen, so it's said, with the mark a held
                cover gets. */}
            {touch && (
                <p className="-mt-1 flex items-center gap-2.5 rounded-sm border border-subtle bg-surface-sunken/60 px-3 py-2.5 text-body-sm text-content-secondary">
                    <span
                        aria-hidden
                        className="grid size-6 shrink-0 place-items-center rounded-xs bg-status-playing text-content-on-solid"
                    >
                        <PlayGlyph size={12} />
                    </span>
                    <span>
                        Still playing one?{" "}
                        <strong className="font-semibold text-content">
                            Hold it down
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

            <ul aria-busy={waiting} className="grid grid-cols-4 gap-2.5">
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
                                  onTap={() => tapPlayed(game)}
                                  touch={touch}
                                  onPlaying={() => tapPlaying(game.id)}
                                  onHold={() => holdPlaying(game)}
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

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Game, Platform } from "@playrates/shared";
import type { DisplayStatus } from "../../../constants/gameStatus";
import GameTile, { type TileAction } from "../../../components/game/GameTile";
import { TileSkeleton } from "../../../components/ui/Skeleton";
import { releaseYear } from "../../../lib/format";
import { cn } from "../../../lib/cn";

interface RailProps {
    title: string;
    /** Only when it says something the title doesn't. */
    note?: string;
    games: Game[];
    platforms: Platform[];
    isLoading: boolean;
    /** Builds the hover action for a tile, e.g. "Create log". */
    actionsFor?: (game: Game) => TileAction[];
    /** The viewer's own status for a game, stamped on the cover. */
    statusFor?: (game: Game) => DisplayStatus | null;
    /** The figure under each cover. Defaults to the release year. */
    footValueFor?: (game: Game) => string;
    /** A rating for the figure under each cover, carrying the brand colour
     *  and the "/10". Falls back to the foot value where there is none. */
    ratingFor?: (game: Game) => number | undefined;
}

const ARROW =
    "lift relative flex size-8 cursor-pointer items-center justify-center rounded-full border border-subtle bg-surface-raised text-content-secondary " +
    "before:absolute before:-inset-1.5 before:content-[''] sm:before:hidden " +
    "hover:-translate-y-px hover:border-brand hover:text-content " +
    "disabled:cursor-default disabled:opacity-30 disabled:hover:translate-y-0 disabled:hover:border-subtle " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

/** One shelf of covers. A real overflow row, not a grid that wraps. */
const Rail = ({
    title,
    note,
    games,
    platforms,
    isLoading,
    actionsFor,
    statusFor,
    footValueFor,
    ratingFor,
}: RailProps) => {
    const trackRef = useRef<HTMLDivElement>(null);
    const [edges, setEdges] = useState({ start: true, end: false });

    const measure = useCallback(() => {
        const el = trackRef.current;
        if (!el) return;
        const max = el.scrollWidth - el.clientWidth;
        setEdges({
            start: el.scrollLeft <= 1,
            // 1px of slack: fractional widths never land exactly on the end.
            end: el.scrollLeft >= max - 1,
        });
    }, []);

    useEffect(() => {
        measure();
        const el = trackRef.current;
        if (!el) return;
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        return () => observer.disconnect();
    }, [measure, games.length]);

    /* A page is whatever is currently on screen, less one tile of context. */
    const nudge = (direction: 1 | -1) => {
        const el = trackRef.current;
        if (!el) return;
        el.scrollBy({
            left: direction * Math.max(el.clientWidth - 140, 160),
            behavior: "smooth",
        });
    };

    return (
        <section>
            <header className="mb-4 flex items-baseline justify-between gap-4">
                <div className="flex items-baseline gap-3">
                    <h2 className="font-display text-section text-content">
                        {title}
                    </h2>
                    {note && (
                        <span className="hidden text-label text-content-muted sm:inline">
                            {note}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        aria-label={`Scroll ${title} back`}
                        disabled={edges.start}
                        onClick={() => nudge(-1)}
                        className={ARROW}
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <button
                        type="button"
                        aria-label={`Scroll ${title} forward`}
                        disabled={edges.end}
                        onClick={() => nudge(1)}
                        className={ARROW}
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </header>

            <div
                ref={trackRef}
                onScroll={measure}
                className={cn(
                    // `contain:layout` or the track's content widens the
                    // layout viewport itself, letting the whole page pan
                    // sideways on a phone. Clipping an ancestor does not fix
                    // it; only containment here does.
                    "flex snap-x snap-mandatory gap-3.5 overflow-x-auto pb-2 [contain:layout]",
                    // The lift moves tiles up; without room they clip.
                    "-mt-1 pt-1",
                    "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                )}
            >
                {(isLoading
                    ? Array.from({ length: 7 }, (_, i) => ({ id: -i - 1 }))
                    : games
                ).map((game) => (
                    <div
                        key={game.id}
                        className="w-[136px] shrink-0 snap-start sm:w-[150px] lg:w-[164px]"
                    >
                        {isLoading ? (
                            <TileSkeleton />
                        ) : (
                            <GameTile
                                gameId={(game as Game).id}
                                title={(game as Game).title}
                                coverUrl={(game as Game).coverUrl}
                                platformSlugs={(game as Game).platforms}
                                platforms={platforms}
                                footValue={
                                    footValueFor?.(game as Game) ??
                                    releaseYear((game as Game).releaseDate)
                                }
                                rating={ratingFor?.(game as Game)}
                                status={statusFor?.(game as Game)}
                                actions={actionsFor?.(game as Game)}
                            />
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
};

export default Rail;

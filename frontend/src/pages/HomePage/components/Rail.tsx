import { useState } from "react";
import type { Game, Platform } from "@playrates/shared";
import GameTile from "../../../components/game/GameTile";
import { TileSkeleton } from "../../../components/ui/Skeleton";
import { primaryPlatformLabel } from "../../../lib/platforms";
import { releaseYear } from "../../../lib/format";
import { cn } from "../../../lib/cn";

interface RailProps {
    title: string;
    note: string;
    games: Game[];
    platforms: Platform[];
    isLoading: boolean;
    perPage?: number;
}

const ARROW =
    "plate-press flex size-7 items-center justify-center border border-strong bg-surface-raised font-mono text-content-secondary " +
    "hover:-translate-y-px hover:border-brand hover:text-content disabled:opacity-40 disabled:hover:translate-y-0" +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

/**
 * One shelf of covers with real paging. The rail fetches more than it shows so
 * the arrows move through a set rather than pretending to.
 */
const Rail = ({
    title,
    note,
    games,
    platforms,
    isLoading,
    perPage = 7,
}: RailProps) => {
    const [offset, setOffset] = useState(0);
    const visible = games.slice(offset, offset + perPage);
    const canPrev = offset > 0;
    const canNext = offset + perPage < games.length;

    return (
        <section>
            <header className="mb-4 flex items-baseline justify-between gap-4 border-b border-subtle pb-2.5">
                <div className="flex items-baseline gap-3">
                    <h2 className="font-display text-section text-content">
                        {title}
                    </h2>
                    <span className="text-label text-content-muted">
                        {note}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        aria-label={`Previous ${title}`}
                        disabled={!canPrev}
                        onClick={() => setOffset((o) => Math.max(0, o - perPage))}
                        className={cn(ARROW)}
                    >
                        ‹
                    </button>
                    <button
                        type="button"
                        aria-label={`More ${title}`}
                        disabled={!canNext}
                        onClick={() => setOffset((o) => o + perPage)}
                        className={cn(ARROW)}
                    >
                        ›
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-3 gap-x-3.5 gap-y-4 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-7">
                {isLoading
                    ? Array.from({ length: perPage }, (_, i) => (
                          <TileSkeleton key={i} />
                      ))
                    : visible.map((game) => (
                          <GameTile
                              key={game.id}
                              gameId={game.id}
                              title={game.title}
                              coverUrl={game.coverUrl}
                              footLabel={primaryPlatformLabel(
                                  game.platforms,
                                  platforms
                              )}
                              /* A community average isn't on Game, and the
                                 brand figure is reserved for real PlayRates
                                 ratings — so the year goes here instead. */
                              footValue={releaseYear(game.releaseDate)}
                          />
                      ))}
            </div>
        </section>
    );
};

export default Rail;

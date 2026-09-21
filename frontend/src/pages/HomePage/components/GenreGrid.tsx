import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { Genre } from "@playrates/shared";
import { cn } from "../../../lib/cn";

/**
 * A hue per genre, derived rather than listed: the set comes from RAWG and
 * will grow, and a hard-coded map would leave new genres grey.
 */
const hueFor = (slug: string): number => {
    let hash = 0x811c9dc5;
    for (let i = 0; i < slug.length; i += 1) {
        hash ^= slug.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0) % 360;
};

/**
 * Somewhere to go that is not a cover.
 *
 * The rails all answer "what is popular"; this answers "what am I in the mood
 * for", which is the other half of how people actually pick a game.
 */
const GenreGrid = ({ genres }: { genres: Genre[] }) => {
    if (genres.length === 0) return null;

    return (
        <section>
            <h2 className="mb-3 font-display text-section text-content">
                Browse by genre
            </h2>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
                {genres.slice(0, 15).map((genre) => {
                    const hue = hueFor(genre.slug);
                    return (
                        <Link
                            key={genre.slug}
                            to={`/library?genre=${genre.slug}`}
                            className={cn(
                                "group/genre relative flex items-center gap-2.5 overflow-hidden rounded-md border border-subtle bg-surface-raised px-3.5 py-3 transition-colors duration-300",
                                "hover:border-strong hover:bg-surface-hover",
                                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                            )}
                        >
                            {/* A hue bar, not a hue card. The washed tiles were
                                the only thing on the page made of colour rather
                                than of surface and rule, so they read as
                                imported from a different site. */}
                            <span
                                aria-hidden
                                className="h-7 w-1 shrink-0 rounded-full opacity-75 transition-opacity duration-300 group-hover/genre:opacity-100"
                                style={{
                                    backgroundColor: `hsl(${hue} 65% 55%)`,
                                }}
                            />
                            <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-content">
                                {genre.name}
                            </span>
                            <ChevronRight
                                size={14}
                                aria-hidden
                                className="shrink-0 text-content-muted transition-colors duration-300 group-hover/genre:text-brand"
                            />
                        </Link>
                    );
                })}
            </div>
        </section>
    );
};

export default GenreGrid;

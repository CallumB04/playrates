import { Link } from "react-router-dom";
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
            <h2 className="mb-4 font-display text-section text-content">
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
                                "lift relative overflow-hidden rounded-md border border-subtle px-3.5 py-4",
                                "hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-plate",
                                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                            )}
                        >
                            <span
                                aria-hidden
                                className="absolute inset-0 opacity-90"
                                style={{
                                    backgroundImage: `linear-gradient(135deg, hsl(${hue} 62% 96%), hsl(${
                                        (hue + 40) % 360
                                    } 58% 90%))`,
                                }}
                            />
                            {/* The dark theme needs its own wash: the pale one
                                above would blow a hole in the page. */}
                            <span
                                aria-hidden
                                className="absolute inset-0 hidden opacity-70 dark:block"
                                style={{
                                    backgroundImage: `linear-gradient(135deg, hsl(${hue} 42% 22%), hsl(${
                                        (hue + 40) % 360
                                    } 38% 14%))`,
                                }}
                            />
                            <span className="relative block truncate text-body-sm font-medium text-content">
                                {genre.name}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
};

export default GenreGrid;

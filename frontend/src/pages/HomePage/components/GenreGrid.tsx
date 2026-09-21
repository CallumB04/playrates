import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { genreIcon } from "../../../lib/genreIcons";
import type { Genre } from "@playrates/shared";
import { cn } from "../../../lib/cn";

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
                    const Icon = genreIcon(genre.slug);
                    return (
                        <Link
                            key={genre.slug}
                            to={`/library?genre=${genre.slug}`}
                            className={cn(
                                "group/genre flex items-center gap-2.5 rounded-md border border-subtle bg-surface-raised px-3.5 py-3 transition-colors duration-300",
                                "hover:border-strong hover:bg-surface-hover",
                                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                            )}
                        >
                            <span className="grid size-7 shrink-0 place-items-center rounded-sm bg-surface-sunken text-content-muted transition-colors duration-300 group-hover/genre:bg-brand-subtle group-hover/genre:text-brand">
                                <Icon size={14} aria-hidden />
                            </span>
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

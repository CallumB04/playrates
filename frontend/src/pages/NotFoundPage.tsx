import { Link } from "react-router-dom";
import { buttonClass } from "../components/ui/Button";
import GameTile from "../components/game/GameTile";
import { TileSkeleton } from "../components/ui/Skeleton";
import { useGames, usePlatforms } from "../hooks/queries/useGames";
import { releaseYear } from "../lib/format";

/** The apology, then the week's most-logged underneath. */
const NotFoundPage = () => {
    const { data: popular, isLoading } = useGames({
        sort: "logged",
        limit: 7,
    });
    const { data: platforms } = usePlatforms();

    return (
        <div className="flex flex-col gap-10">
            <section className="flex flex-col items-start gap-6 rounded-lg border border-dashed border-strong bg-surface-sunken/60 px-6 py-12 sm:flex-row sm:items-center sm:px-10">
                <span
                    aria-hidden
                    className="shrink-0 stamp rounded-sm border-[1.5px] border-danger px-3 py-1.5 text-label text-danger"
                >
                    404
                </span>
                <div>
                    <h1 className="font-display text-title text-content">
                        Page not found
                    </h1>
                    <p className="mt-2.5 max-w-[46ch] text-body text-content-secondary">
                        The link may be out of date, or the page may have moved.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                        <Link to="/library" className={buttonClass("primary")}>
                            Browse the library
                        </Link>
                        <Link to="/" className={buttonClass("ghost")}>
                            Back to home
                        </Link>
                    </div>
                </div>
            </section>

            <section>
                <header className="mb-4 flex items-baseline gap-3 border-b border-subtle pb-2.5">
                    <h2 className="font-display text-section text-content">
                        Most logged
                    </h2>
                    <span className="text-label text-content-muted">
                        while you’re here
                    </span>
                </header>
                <div className="grid grid-cols-3 gap-x-3.5 gap-y-4 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-7">
                    {isLoading
                        ? Array.from({ length: 7 }, (_, i) => (
                              <TileSkeleton key={i} />
                          ))
                        : (popular?.data ?? []).map((game) => (
                              <GameTile
                                  key={game.id}
                                  gameId={game.id}
                                  title={game.title}
                                  coverUrl={game.coverUrl}
                                  platformSlugs={game.platforms}
                                  platforms={platforms ?? []}
                                  footValue={releaseYear(game.releaseDate)}
                                  narrowFoot
                              />
                          ))}
                </div>
            </section>
        </div>
    );
};

export default NotFoundPage;

import { Link } from "react-router-dom";
import { buttonClass } from "../components/ui/Button";
import GameTile from "../components/game/GameTile";
import { TileSkeleton } from "../components/ui/Skeleton";
import { useGames, usePlatforms } from "../hooks/queries/useGames";
import { primaryPlatformLabel } from "../lib/platforms";
import { releaseYear } from "../lib/format";

/**
 * A card withdrawn from the drawer, stamped NOT ON FILE — with the week's
 * most-tracked underneath, so the page is still worth landing on.
 */
const NotFoundPage = () => {
    const { data: popular, isLoading } = useGames({
        sort: "logged",
        limit: 7,
    });
    const { data: platforms } = usePlatforms();

    return (
        <div className="flex flex-col gap-10">
            <section className="flex flex-col items-start gap-6 border border-dashed border-strong bg-surface-sunken px-6 py-10 sm:flex-row sm:items-center sm:px-10">
                <span
                    aria-hidden
                    className="stamp shrink-0 border-[1.5px] border-danger px-3 py-1.5 text-label text-danger"
                >
                    Not on file
                </span>
                <div>
                    <h1 className="font-display text-title text-content">
                        That page isn’t in the drawer.
                    </h1>
                    <p className="mt-2.5 max-w-[46ch] text-body text-content-secondary">
                        The link may be old, or the card may have been withdrawn.
                        The catalogue is still where you left it.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                        <Link to="/library" className={buttonClass("primary")}>
                            Browse the catalogue
                        </Link>
                        <Link to="/" className={buttonClass("ghost")}>
                            Back to home
                        </Link>
                    </div>
                </div>
            </section>

            <section>
                <header className="mb-4 flex items-baseline gap-3 border-b border-strong pb-2.5">
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
                                  footLabel={primaryPlatformLabel(
                                      game.platforms,
                                      platforms ?? []
                                  )}
                                  footValue={releaseYear(game.releaseDate)}
                              />
                          ))}
                </div>
            </section>
        </div>
    );
};

export default NotFoundPage;

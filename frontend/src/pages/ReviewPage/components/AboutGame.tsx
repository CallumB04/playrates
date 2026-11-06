import { Link } from "react-router-dom";
import type { ReviewGame } from "@playrates/shared";
import AsideCard from "../../../components/ui/AsideCard";
import { buttonClass } from "../../../components/ui/buttonClass";
import RatingBadge from "../../../components/ui/RatingBadge";
import { useGame, useGenres } from "../../../hooks/queries/useGames";
import { formatCount, releaseYear } from "../../../lib/format";

/** The game in a few lines, so one review can be read against the rest. */
const AboutGame = ({ game: { id, title } }: { game: ReviewGame }) => {
    const { data: game } = useGame(id);
    const { data: genres } = useGenres();
    const year = releaseYear(game?.releaseDate);
    const genreNames = (game?.genres ?? [])
        .slice(0, 3)
        .map((slug) => genres?.find((g) => g.slug === slug)?.name ?? slug);

    return (
        <AsideCard
            title="The game"
            bodyClassName="flex flex-col gap-3 px-3 pb-1.5"
        >
            {game && (
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-body-sm">
                    {game.avgRating !== null && (
                        <>
                            <dt className="text-content-muted">Average</dt>
                            <dd className="flex items-baseline gap-2">
                                <RatingBadge value={game.avgRating} />
                                <span className="text-label-sm text-content-muted">
                                    from {formatCount(game.ratingCount)}{" "}
                                    {game.ratingCount === 1
                                        ? "rating"
                                        : "ratings"}
                                </span>
                            </dd>
                        </>
                    )}
                    {year && (
                        <>
                            <dt className="text-content-muted">Released</dt>
                            <dd className="font-mono text-content">{year}</dd>
                        </>
                    )}
                    {game.developers.length > 0 && (
                        <>
                            <dt className="text-content-muted">Developer</dt>
                            <dd className="text-content">
                                {game.developers[0]}
                            </dd>
                        </>
                    )}
                    {genreNames.length > 0 && (
                        <>
                            <dt className="text-content-muted">Genres</dt>
                            <dd className="text-content">
                                {genreNames.join(", ")}
                            </dd>
                        </>
                    )}
                </dl>
            )}
            <Link
                to={`/game/${id}`}
                className={buttonClass("secondary", "w-full")}
            >
                Go to {title}
            </Link>
        </AsideCard>
    );
};

export default AboutGame;

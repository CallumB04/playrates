import type { Platform } from "@playrates/shared";
import GameRail from "../../../components/game/GameRail";
import { useGameRelated } from "../../../hooks/queries/useGames";

interface RelatedGamesProps {
    gameId: number;
    platforms: Platform[];
}

/**
 * Where to go from here, below everything about the game itself: the rest
 * of its series, more from its developer, and games like it. A row with
 * nothing in it is left out, and the whole section with it when all three
 * are empty.
 */
const RelatedGames = ({ gameId, platforms }: RelatedGamesProps) => {
    const { data } = useGameRelated(gameId);
    if (!data) return null;

    const rows = [
        data.series && {
            key: "series",
            title: `The ${data.series.name.replace(/^the /i, "")} series`,
            games: data.series.games,
        },
        data.developer && {
            key: "developer",
            title: `More from ${data.developer.name}`,
            games: data.developer.games,
        },
        data.similar.length > 0 && {
            key: "similar",
            title: "You might also like",
            games: data.similar,
        },
    ].filter((row) => !!row);

    if (rows.length === 0) return null;

    return (
        <section
            aria-label="Related games"
            className="flex flex-col gap-8 border-t border-subtle pt-8"
        >
            {rows.map((row) => (
                <GameRail
                    key={row.key}
                    title={row.title}
                    games={row.games}
                    platforms={platforms}
                    isLoading={false}
                />
            ))}
        </section>
    );
};

export default RelatedGames;

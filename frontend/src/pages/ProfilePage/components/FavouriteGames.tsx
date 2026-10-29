import { Pencil, Plus } from "lucide-react";
import { MAX_FAVOURITE_GAMES } from "@playrates/shared";
import Panel from "../../../components/ui/Panel";
import Button from "../../../components/ui/Button";
import GameTile from "../../../components/game/GameTile";
import { useTileActions } from "../../../components/game/useTileActions";
import { usePlatforms } from "../../../hooks/queries/useGames";
import { releaseYear } from "../../../lib/format";
import { Skeleton } from "../../../components/ui/Skeleton";
import { useUserFavourites } from "../../../hooks/queries/useFavourites";
import { cn } from "../../../lib/cn";
import { rankTone } from "../lib/about";
import { displayStatusFor } from "../../../constants/gameStatus";

interface FavouriteGamesProps {
    username: string;
    canSee: boolean;
    /** Set on your own profile, to open the editor. */
    onEdit?: () => void;
}

/* The list is ordered, so a screen reader already counts it; the number
   here is for the eye, and its colour for the podium. */
export const Rank = ({ place }: { place: number }) => (
    <span
        aria-hidden
        className={cn(
            "mb-1.5 block font-mono text-label font-semibold tabular-nums",
            rankTone(place)
        )}
    >
        #{place}
    </span>
);

const GRID = "grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3";

/** Up to six covers, in the order their owner put them. */
const FavouriteGames = ({ username, canSee, onEdit }: FavouriteGamesProps) => {
    const { data: games, isLoading } = useUserFavourites(username, canSee);
    const { data: platforms } = usePlatforms();
    // The viewer's own log of each, as on every other cover.
    const { actionsFor } = useTileActions();
    const owner = !!onEdit;

    // Nothing to say to a visitor about favourites nobody has chosen.
    if (!owner && !isLoading && (games?.length ?? 0) === 0) return null;

    return (
        <Panel
            title="Favourite games"
            trailing={
                owner &&
                (games?.length ?? 0) > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onEdit}
                        className="-my-1 max-sm:min-h-11"
                    >
                        <Pencil size={14} aria-hidden />
                        Edit
                    </Button>
                )
            }
        >
            {isLoading || !canSee ? (
                <div className={GRID}>
                    {Array.from({ length: MAX_FAVOURITE_GAMES }, (_, i) => (
                        <Skeleton key={i} className="aspect-3/4 rounded-xs" />
                    ))}
                </div>
            ) : (
                <ol className={GRID}>
                    {(games ?? []).map((game, i) => (
                        <li key={game.id}>
                            <Rank place={i + 1} />
                            <GameTile
                                gameId={game.id}
                                title={game.title}
                                coverUrl={game.coverUrl}
                                platformSlugs={game.platforms}
                                platforms={platforms ?? []}
                                footValue={releaseYear(game.releaseDate)}
                                // Theirs, not the viewer's: on their
                                // profile it reads as what they did with it.
                                status={
                                    game.ownerStatus
                                        ? displayStatusFor(
                                              game.ownerStatus.status,
                                              game.ownerStatus.playedStatus
                                          )
                                        : null
                                }
                                actions={actionsFor(game)}
                                narrowFoot
                            />
                        </li>
                    ))}
                    {/* The places still free, each a way to fill one. */}
                    {owner &&
                        Array.from(
                            {
                                length:
                                    MAX_FAVOURITE_GAMES - (games?.length ?? 0),
                            },
                            (_, i) => (
                                <li key={`free-${i}`}>
                                    <Rank
                                        place={(games?.length ?? 0) + i + 1}
                                    />
                                    <button
                                        type="button"
                                        onClick={onEdit}
                                        aria-label="Add a favourite game"
                                        className="grid aspect-3/4 w-full cursor-pointer place-items-center rounded-xs border border-dashed border-strong text-content-muted lift hover:border-brand hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                                    >
                                        <Plus size={18} aria-hidden />
                                    </button>
                                </li>
                            )
                        )}
                </ol>
            )}
        </Panel>
    );
};

export default FavouriteGames;

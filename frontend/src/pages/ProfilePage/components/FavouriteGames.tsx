import { Link } from "react-router-dom";
import { Pencil, Plus } from "lucide-react";
import { MAX_FAVOURITE_GAMES } from "@playrates/shared";
import Panel from "../../../components/ui/Panel";
import Button from "../../../components/ui/Button";
import GameCover from "../../../components/game/GameCover";
import { Skeleton } from "../../../components/ui/Skeleton";
import { useUserFavourites } from "../../../hooks/queries/useFavourites";

interface FavouriteGamesProps {
    username: string;
    canSee: boolean;
    /** Set on your own profile, to open the editor. */
    onEdit?: () => void;
}

const GRID = "grid grid-cols-5 gap-2 sm:gap-3";

/** Up to five covers, in the order their owner put them. */
const FavouriteGames = ({ username, canSee, onEdit }: FavouriteGamesProps) => {
    const { data: games, isLoading } = useUserFavourites(username, canSee);
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
                    {(games ?? []).map((game) => (
                        <li key={game.id}>
                            <Link
                                to={`/game/${game.id}`}
                                aria-label={game.title}
                                title={game.title}
                                className="block rounded-xs lift hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                            >
                                <GameCover
                                    coverUrl={game.coverUrl}
                                    title={game.title}
                                    className="aspect-3/4 w-full overflow-hidden rounded-xs shadow-cover"
                                />
                            </Link>
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

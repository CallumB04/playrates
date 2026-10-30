import { Link } from "react-router-dom";
import Panel, { panelButtonClass } from "../../../components/ui/Panel";
import GameTile from "../../../components/game/GameTile";
import { Skeleton } from "../../../components/ui/Skeleton";
import { buttonClass } from "../../../components/ui/Button";
import { usePlatforms } from "../../../hooks/queries/useGames";
import { useUserWishlist } from "../../../hooks/queries/useWishlist";
import { formatCount, releaseYear } from "../../../lib/format";
import { shelfPath } from "../../../lib/profilePaths";
import { useShelfTileActions } from "../lib/useShelfTileActions";
import { cn } from "../../../lib/cn";
import { podiumOnPhone } from "../lib/about";
import { Rank } from "./FavouriteGames";

const TOP = 6;
const GRID = "grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3";

interface WishlistTopProps {
    username: string;
    isMyAccount: boolean;
    canSee: boolean;
}

/** The first six on someone's wishlist, in their order. */
const WishlistTop = ({ username, isMyAccount, canSee }: WishlistTopProps) => {
    const { data, isLoading } = useUserWishlist(
        username,
        { limit: TOP },
        canSee
    );
    const { data: platforms } = usePlatforms();
    const { buildTileActions } = useShelfTileActions(username, isMyAccount);
    const games = data?.data ?? [];
    const total = data?.total ?? 0;

    if (!isMyAccount && !isLoading && canSee && total === 0) return null;

    return (
        <Panel title="Top of the wishlist">
            {isLoading || !canSee ? (
                <div className={GRID}>
                    {Array.from({ length: TOP }, (_, i) => (
                        <Skeleton
                            key={i}
                            className={cn(
                                "aspect-3/4 rounded-xs",
                                podiumOnPhone(i + 1)
                            )}
                        />
                    ))}
                </div>
            ) : total === 0 ? (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                    <p className="text-body-sm text-content-muted">
                        Nothing on your wishlist yet.
                    </p>
                    <Link
                        to="/library"
                        className={buttonClass("secondary", "w-full sm:w-auto")}
                    >
                        Browse the library
                    </Link>
                </div>
            ) : (
                <>
                    <ol className={GRID}>
                        {games.map((entry) => (
                            <li
                                key={entry.gameId}
                                className={podiumOnPhone(entry.rank)}
                            >
                                <Rank place={entry.rank} />
                                <GameTile
                                    gameId={entry.gameId}
                                    title={entry.game?.title ?? "Unknown game"}
                                    coverUrl={entry.game?.coverUrl ?? null}
                                    platformSlugs={entry.game?.platforms ?? []}
                                    platforms={platforms ?? []}
                                    footValue={releaseYear(
                                        entry.game?.releaseDate
                                    )}
                                    actions={buildTileActions(entry)}
                                    narrowFoot
                                />
                            </li>
                        ))}
                    </ol>
                    {/* Even under six: the whole list is where it's ordered. */}
                    <Link
                        to={shelfPath(username, "wishlist")}
                        className={panelButtonClass(
                            false,
                            "mt-4 w-full sm:min-h-10"
                        )}
                    >
                        See all {formatCount(total)}
                    </Link>
                </>
            )}
        </Panel>
    );
};

export default WishlistTop;

import { useMemo } from "react";
import type { WishlistEntry } from "@playrates/shared";
import type { TileAction } from "../../../components/game/GameTile";
import Button from "../../../components/ui/Button";
import RankedList from "../../../components/ranked/RankedList";
import RankedGameRow from "../../../components/ranked/RankedGameRow";
import { ApiError } from "../../../api";
import { useNotify } from "../../../contexts/NotificationContext";
import { usePlatformSystems } from "../../../hooks/queries/useGames";
import { useReorderWishlist } from "../../../hooks/queries/useWishlist";
import { formatCount } from "../../../lib/format";
import {
    narrowWishlist,
    sortWishlist,
    wishlistFiltered,
    type WishlistFilters,
    type WishlistSort,
} from "../lib/wishlist";
import ConsoleChips from "./ConsoleChips";
import WishlistConsoles from "./WishlistConsoles";

interface WishlistListProps {
    /** The whole wishlist, in its owner's order. */
    wishlist: WishlistEntry[];
    filters: WishlistFilters;
    sort: WishlistSort;
    isMyAccount: boolean;
    buildTileActions: (entry: WishlistEntry) => TileAction[];
}

/** The order a save failing with this should be told: a stale tab is worth
 *  explaining, anything else is just a failure. */
const saveFailure = (error: unknown) =>
    error instanceof ApiError && error.status === 422
        ? error.message
        : "Couldn’t save your wishlist order";

const idOf = (entry: WishlistEntry) => entry.gameId;

/** The wishlist as a ranked list, which its owner can put in order. */
const WishlistList = ({
    wishlist,
    filters,
    sort,
    isMyAccount,
    buildTileActions,
}: WishlistListProps) => {
    const notify = useNotify();
    const reorder = useReorderWishlist();
    const { data: systemList } = usePlatformSystems();
    const systems = useMemo(
        () => new Map((systemList ?? []).map((s) => [s.slug, s])),
        [systemList]
    );
    const shown = useMemo(() => {
        const ranked = wishlist.map((entry, i) => ({ ...entry, rank: i + 1 }));
        return sortWishlist(narrowWishlist(ranked, filters), sort);
    }, [wishlist, filters, sort]);

    /* Only the whole list in its own order: filtered, a move would have to
       guess where among the hidden games it meant to land. */
    const filtered = wishlistFiltered(filters);
    const canReorder = isMyAccount && sort === "rank" && !filtered;
    const hint = !isMyAccount
        ? undefined
        : sort !== "rank"
          ? "Sort by your order to rearrange."
          : !filtered
            ? undefined
            : filters.console && !filters.q && !filters.genre
              ? "Clear the platform filter to rearrange."
              : filters.q && !filters.console && !filters.genre
                ? "Clear the search to rearrange."
                : "Clear the filters to rearrange.";

    return (
        <RankedList
            items={shown}
            idOf={idOf}
            rankOf={(entry) => entry.rank}
            titleOf={(entry) => entry.game?.title ?? "Unknown game"}
            coverOf={(entry) => entry.game?.coverUrl ?? null}
            total={wishlist.length}
            canReorder={canReorder}
            hint={hint}
            onReorder={(order) =>
                reorder.mutateAsync(order).catch((error: unknown) => {
                    notify(saveFailure(error), "error");
                    throw error;
                })
            }
            describe={(rank, total) =>
                `#${rank} of ${formatCount(total)} on ${isMyAccount ? "your" : "their"} wishlist`
            }
            renderRow={(entry, row) => (
                <RankedGameRow
                    ref={row.ref}
                    style={row.style}
                    gameId={entry.gameId}
                    title={entry.game?.title ?? "Unknown game"}
                    coverUrl={entry.game?.coverUrl ?? null}
                    artworkUrl={entry.game?.artworkUrl}
                    releaseDate={entry.game?.releaseDate}
                    rank={row.rank}
                    handle={row.handle}
                    lifted={row.lifted}
                    ghost={row.ghost}
                    detail={
                        isMyAccount ? (
                            <WishlistConsoles
                                entry={entry}
                                systems={systemList ?? []}
                            />
                        ) : (
                            <ConsoleChips
                                consoles={entry.consoles}
                                systems={systems}
                            />
                        )
                    }
                    actions={buildTileActions(entry)}
                    onMore={row.onMore}
                    // A visitor's sheet only holds what the row shows from sm up.
                    moreOnPhoneOnly={!isMyAccount}
                />
            )}
            sheetActions={(entry, close) => {
                const actions = buildTileActions(entry).filter((a) => !a.icon);
                // From sm up the row carries these itself.
                return actions.length > 0 ? (
                    <div className="mt-4 flex flex-col gap-2 border-t border-subtle pt-4 sm:hidden">
                        {actions.map((action) => (
                            <Button
                                key={action.key}
                                size="touch"
                                variant={
                                    action.tone === "primary"
                                        ? "primary"
                                        : "secondary"
                                }
                                onClick={() => {
                                    void action.onSelect();
                                    close();
                                }}
                            >
                                {action.label}
                            </Button>
                        ))}
                    </div>
                ) : null;
            }}
        />
    );
};

export default WishlistList;

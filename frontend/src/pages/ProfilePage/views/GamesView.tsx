import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
    GAME_LOG_SORTS,
    PLAYED_STATUSES,
    type GameLogSort,
    type PlayedStatusFilter,
    type SortDirection,
    type UserStats,
} from "@playrates/shared";
import { useUserShelf } from "../../../hooks/queries/useGameLogs";
import {
    useShelfConsoles,
    useUserWishlist,
} from "../../../hooks/queries/useWishlist";
import { usePlatforms } from "../../../hooks/queries/useGames";
import { useWindowSize } from "../../../hooks/useWindowSize";
import { usePagination } from "../../../hooks/usePagination";
import { GAME_STATUSES, type GameStatus } from "../../../constants/gameStatus";
import { formatCount } from "../../../lib/format";
import ShelfPanel from "../components/ShelfPanel";
import ShelfSort from "../components/ShelfSort";
import ShelfFilters from "../components/ShelfFilters";
import WishlistList from "../components/WishlistList";
import WishlistSortControl from "../components/WishlistSortControl";
import { WISHLIST_SORTS, type WishlistSort } from "../lib/wishlist";
import { getProfileGamesPerPage } from "../lib/friendRelation";
import { usePageParam } from "../lib/usePageParam";
import { useShelfTileActions } from "../lib/useShelfTileActions";

interface GamesViewProps {
    username: string;
    isMyAccount: boolean;
    stats: UserStats | undefined;
    /** Off while it isn't known whether this viewer may see the games. */
    canSee: boolean;
}

const isGameStatus = (value: string): value is GameStatus =>
    (GAME_STATUSES as readonly string[]).includes(value);

/** The four shelves, one at a time, sorted and paged in the URL. */
const GamesView = ({
    username,
    isMyAccount,
    stats,
    canSee,
}: GamesViewProps) => {
    const { width } = useWindowSize();
    const [params, setParams] = useSearchParams();
    const [page, setPage] = usePageParam();
    const perPage = getProfileGamesPerPage(width);

    const rawType = params.get("type") ?? "played";
    const activeSection: GameStatus = isGameStatus(rawType)
        ? rawType
        : "played";

    /* In the URL alongside the tab, so a sorted shelf survives a reload and
       can be linked to. Anything unrecognised falls back to the default. */
    const rawSort = params.get("sort");
    const sort: GameLogSort = GAME_LOG_SORTS.includes(rawSort as GameLogSort)
        ? (rawSort as GameLogSort)
        : "rating";
    const direction: SortDirection =
        params.get("direction") === "asc" ? "asc" : "desc";

    const isWishlist = activeSection === "wishlist";
    const wishlistSort: WishlistSort = WISHLIST_SORTS.includes(
        rawSort as WishlistSort
    )
        ? (rawSort as WishlistSort)
        : "rank";
    const consoleSlug = params.get("platform") || undefined;

    const rawPlayed = params.get("ending");
    const playedStatus: PlayedStatusFilter | undefined =
        rawPlayed === "none" ||
        PLAYED_STATUSES.includes(rawPlayed as (typeof PLAYED_STATUSES)[number])
            ? (rawPlayed as PlayedStatusFilter)
            : undefined;

    const { buildTileActions, myLogGameIds } = useShelfTileActions(
        username,
        isMyAccount
    );

    // Each tab pages independently.
    const { data: logsPage, isLoading } = useUserShelf(
        username,
        activeSection,
        {
            page,
            limit: perPage,
            sort,
            direction,
            // Only the played shelf has endings to filter by.
            playedStatus: activeSection === "played" ? playedStatus : undefined,
            system: consoleSlug,
        },
        canSee && !isWishlist
    );
    /* The wishlist comes whole and filters here: a move made while it is
       filtered still has to save the order of all of it. */
    const { data: wishlistPage, isLoading: wishlistLoading } = useUserWishlist(
        username,
        {},
        canSee && isWishlist
    );
    const { data: shelfConsoles } = useShelfConsoles(
        username,
        activeSection,
        canSee && !isWishlist
    );
    const consoles =
        (isWishlist ? wishlistPage?.consoles : shelfConsoles) ?? [];
    const { data: platforms } = usePlatforms();

    const wishlist = useMemo(() => wishlistPage?.data ?? [], [wishlistPage]);
    const entries = useMemo(
        () =>
            isWishlist
                ? consoleSlug
                    ? wishlist.filter((e) => e.consoles.includes(consoleSlug))
                    : wishlist
                : (logsPage?.data ?? []),
        [isWishlist, consoleSlug, wishlist, logsPage]
    );
    // Unpaged, so the wishlist gives the foot nothing to count.
    const total = isWishlist ? 0 : (logsPage?.meta.total ?? 0);

    const pagination = usePagination({
        total,
        perPage,
        page,
        onPageChange: setPage,
    });

    const setOrder = (next: {
        sort?: GameLogSort;
        direction?: SortDirection;
    }) => {
        const updated = new URLSearchParams(params);
        if (next.sort) updated.set("sort", next.sort);
        if (next.direction) updated.set("direction", next.direction);
        updated.delete("page"); // a reordered shelf starts again at the top
        setParams(updated);
    };

    const setEnding = (next: PlayedStatusFilter | undefined) => {
        const updated = new URLSearchParams(params);
        if (next) updated.set("ending", next);
        else updated.delete("ending");
        updated.delete("page");
        setParams(updated);
    };

    const setConsole = (next: string | undefined) => {
        const updated = new URLSearchParams(params);
        if (next) updated.set("platform", next);
        else updated.delete("platform");
        updated.delete("page");
        setParams(updated);
    };

    const clearFilters = () => {
        const updated = new URLSearchParams(params);
        updated.delete("ending");
        updated.delete("platform");
        updated.delete("page");
        setParams(updated);
    };

    const setWishlistSort = (next: WishlistSort) => {
        const updated = new URLSearchParams(params);
        updated.set("sort", next);
        setParams(updated);
    };

    const setSection = (status: GameStatus) => {
        const updated = new URLSearchParams(params);
        updated.set("type", status);
        updated.delete("page"); // a new drawer opens at its own first page
        // Each shelf has its own consoles.
        updated.delete("platform");
        // The wishlist sorts its own way; neither set means much to the other.
        if ((status === "wishlist") !== isWishlist) {
            updated.delete("sort");
            updated.delete("direction");
        }
        // No other shelf has endings, so the filter would be a lie in the URL.
        if (status !== "played") updated.delete("ending");
        setParams(updated);
    };

    return (
        <ShelfPanel
            active={activeSection}
            // Every tab's count: the stats endpoint returns the whole breakdown.
            counts={
                stats?.byStatus ?? {
                    [activeSection]: isWishlist ? wishlist.length : total,
                }
            }
            onSelect={setSection}
            entries={entries}
            platforms={platforms ?? []}
            isLoading={(isWishlist ? wishlistLoading : isLoading) || !canSee}
            pagination={pagination}
            perPage={perPage}
            buildTileActions={buildTileActions}
            isMyAccount={isMyAccount}
            sort={sort}
            filtered={
                !!consoleSlug || (activeSection === "played" && !!playedStatus)
            }
            list={
                isWishlist && (
                    <WishlistList
                        wishlist={wishlist}
                        console={consoleSlug}
                        sort={wishlistSort}
                        isMyAccount={isMyAccount}
                        buildTileActions={buildTileActions}
                    />
                )
            }
            trailing={
                /* The filters fold into one button so the sort keeps its
                   width: squeezed beside them, "Time played" and "Time to
                   beat" both read "Time…". */
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap sm:gap-3">
                    {!isMyAccount && myLogGameIds && (
                        <span className="text-label text-accent max-sm:hidden">
                            {formatCount(
                                entries.filter((e) =>
                                    myLogGameIds.has(e.gameId)
                                ).length
                            )}{" "}
                            in common
                        </span>
                    )}
                    <ShelfFilters
                        ending={
                            activeSection === "played"
                                ? { value: playedStatus, onChange: setEnding }
                                : undefined
                        }
                        consoles={consoles}
                        console={consoleSlug}
                        onConsoleChange={setConsole}
                        onClear={clearFilters}
                    />
                    {isWishlist ? (
                        <WishlistSortControl
                            sort={wishlistSort}
                            isMyAccount={isMyAccount}
                            onChange={setWishlistSort}
                        />
                    ) : (
                        <ShelfSort
                            sort={sort}
                            direction={direction}
                            isMyAccount={isMyAccount}
                            onChange={setOrder}
                        />
                    )}
                </div>
            }
        />
    );
};

export default GamesView;

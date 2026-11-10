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
    useShelfGenres,
    useUserWishlist,
} from "../../../hooks/queries/useWishlist";
import { usePlatforms } from "../../../hooks/queries/useGames";
import { useWindowSize } from "../../../hooks/useWindowSize";
import { usePagination } from "../../../hooks/usePagination";
import { useUrlSearchTerm } from "../../../hooks/useUrlSearchTerm";
import { GAME_STATUSES, type GameStatus } from "../../../constants/gameStatus";
import SteamImportButton from "../../../components/steam/SteamImportButton";
import ShelfPanel from "../components/ShelfPanel";
import ShelfSort from "../components/ShelfSort";
import ShelfFilters from "../components/ShelfFilters";
import WishlistList from "../components/WishlistList";
import WishlistSortControl from "../components/WishlistSortControl";
import {
    WISHLIST_SORTS,
    narrowWishlist,
    type WishlistFilters,
    type WishlistSort,
} from "../lib/wishlist";
import { getProfileGamesPerPage } from "../lib/friendRelation";
import { defaultShelfSort, sortForShelf } from "../lib/shelfSort";
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
    const sort: GameLogSort = sortForShelf(
        GAME_LOG_SORTS.includes(rawSort as GameLogSort)
            ? (rawSort as GameLogSort)
            : defaultShelfSort(activeSection),
        activeSection
    );
    const direction: SortDirection =
        params.get("direction") === "asc" ? "asc" : "desc";

    const isWishlist = activeSection === "wishlist";
    const wishlistSort: WishlistSort = WISHLIST_SORTS.includes(
        rawSort as WishlistSort
    )
        ? (rawSort as WishlistSort)
        : "rank";
    const consoleSlug = params.get("platform") || undefined;
    const genre = params.get("genre") || undefined;

    const rawPlayed = params.get("ending");
    const playedStatus: PlayedStatusFilter | undefined =
        rawPlayed === "none" ||
        PLAYED_STATUSES.includes(rawPlayed as (typeof PLAYED_STATUSES)[number])
            ? (rawPlayed as PlayedStatusFilter)
            : undefined;

    // Kept from shelf to shelf: "which of my Zelda games are in the backlog?"
    const {
        term,
        setTerm,
        value: q,
    } = useUrlSearchTerm("q", { alsoClear: ["page"] });

    const { buildTileActions, myLogGameIds } = useShelfTileActions(
        username,
        isMyAccount
    );

    // Only someone else's shelf, to a viewer whose own logs have loaded.
    const offerCommon = !isMyAccount && !!myLogGameIds;
    const common =
        offerCommon && params.get("common") === "both" ? "both" : undefined;

    const narrowing = {
        // Only the played shelf has endings to filter by.
        playedStatus: activeSection === "played" ? playedStatus : undefined,
        system: consoleSlug,
        q,
        genre,
    };
    // Each tab pages independently.
    const { data: logsPage, isLoading } = useUserShelf(
        username,
        activeSection,
        { page, limit: perPage, sort, direction, ...narrowing, common },
        canSee && !isWishlist
    );
    // How many the in-common switch would leave: one row, for the total.
    const { data: commonPage } = useUserShelf(
        username,
        activeSection,
        { page: 1, limit: 1, sort, direction, ...narrowing, common: "both" },
        canSee && !isWishlist && offerCommon
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
    const { data: shelfGenres } = useShelfGenres(
        username,
        activeSection,
        canSee && !isWishlist
    );
    const consoles =
        (isWishlist ? wishlistPage?.consoles : shelfConsoles) ?? [];
    const genres = (isWishlist ? wishlistPage?.genres : shelfGenres) ?? [];
    const { data: platforms } = usePlatforms();

    const wishlist = useMemo(() => wishlistPage?.data ?? [], [wishlistPage]);
    const wishlistFilters = useMemo<WishlistFilters>(
        () => ({
            console: consoleSlug,
            q,
            genre,
            common: common && myLogGameIds ? myLogGameIds : undefined,
        }),
        [consoleSlug, q, genre, common, myLogGameIds]
    );
    const entries = useMemo(
        () =>
            isWishlist
                ? narrowWishlist(wishlist, wishlistFilters)
                : (logsPage?.data ?? []),
        [isWishlist, wishlistFilters, wishlist, logsPage]
    );
    const commonCount = !offerCommon
        ? undefined
        : isWishlist
          ? narrowWishlist(wishlist, {
                ...wishlistFilters,
                common: myLogGameIds,
            }).length
          : commonPage?.meta.total;
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

    const setGenre = (next: string | undefined) => {
        const updated = new URLSearchParams(params);
        if (next) updated.set("genre", next);
        else updated.delete("genre");
        updated.delete("page");
        setParams(updated);
    };

    const setCommon = (on: boolean) => {
        const updated = new URLSearchParams(params);
        if (on) updated.set("common", "both");
        else updated.delete("common");
        updated.delete("page");
        setParams(updated);
    };

    const clearFilters = () => {
        const updated = new URLSearchParams(params);
        updated.delete("ending");
        updated.delete("platform");
        updated.delete("genre");
        updated.delete("common");
        updated.delete("q");
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
        // Each shelf has its own consoles and genres.
        updated.delete("platform");
        updated.delete("genre");
        // The wishlist sorts its own way; neither set means much to the other.
        if ((status === "wishlist") !== isWishlist) {
            updated.delete("sort");
            updated.delete("direction");
        }
        // No other shelf has endings, so the filter would be a lie in the URL.
        if (status !== "played") {
            updated.delete("ending");
            if (sort === "ending") updated.delete("sort");
        }
        // Nor hype off the backlog, whose default it is.
        if (status !== "backlog" && sort === "hype") updated.delete("sort");
        setParams(updated);
    };

    return (
        <>
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
                isLoading={
                    (isWishlist ? wishlistLoading : isLoading) || !canSee
                }
                pagination={pagination}
                perPage={perPage}
                buildTileActions={buildTileActions}
                isMyAccount={isMyAccount}
                sort={sort}
                filtered={
                    !!consoleSlug ||
                    !!genre ||
                    !!common ||
                    (activeSection === "played" && !!playedStatus)
                }
                search={q}
                list={
                    isWishlist && (
                        <WishlistList
                            wishlist={wishlist}
                            filters={wishlistFilters}
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
                        <ShelfFilters
                            search={{
                                term,
                                onChange: setTerm,
                                active: !!q,
                            }}
                            ending={
                                activeSection === "played"
                                    ? {
                                          value: playedStatus,
                                          onChange: setEnding,
                                      }
                                    : undefined
                            }
                            consoles={consoles}
                            console={consoleSlug}
                            onConsoleChange={setConsole}
                            genres={genres}
                            genre={genre}
                            onGenreChange={setGenre}
                            common={
                                offerCommon
                                    ? {
                                          on: !!common,
                                          count: commonCount,
                                          onChange: setCommon,
                                      }
                                    : undefined
                            }
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
                                shelf={activeSection}
                                onChange={setOrder}
                            />
                        )}
                    </div>
                }
            />
            {/* Once the shelves have something on them: an empty one offers
            the import in its own empty state. */}
            {isMyAccount && entries.length > 0 && (
                <SteamImportButton>
                    {(open) => (
                        <p className="mt-3 text-right text-body-sm text-content-secondary">
                            Got more on Steam?{" "}
                            <button
                                type="button"
                                onClick={open}
                                className="relative cursor-pointer font-medium text-brand-text underline-offset-2 before:absolute before:-inset-x-1 before:-inset-y-3 before:content-[''] hover:underline"
                            >
                                Import your library
                            </button>
                        </p>
                    )}
                </SteamImportButton>
            )}
        </>
    );
};

export default GamesView;

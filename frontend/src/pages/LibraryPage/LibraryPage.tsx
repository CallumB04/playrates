import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
    useCatalogueReach,
    useGames,
    useGenres,
    usePlatforms,
} from "../../hooks/queries/useGames";
import { useWindowSize } from "../../hooks/useWindowSize";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { usePagination } from "../../hooks/usePagination";
import { usePageTitle } from "../../hooks/usePageTitle";
import GameTile from "../../components/game/GameTile";
import { useTileActions } from "../../components/game/useTileActions";
import Pagination, { PaginationSummary } from "../../components/ui/Pagination";
import { Skeleton, TileSkeleton } from "../../components/ui/Skeleton";
import PageHeader from "../../components/ui/PageHeader";
import EmptyPlate from "../../components/ui/EmptyPlate";
import LoadingSpinner from "../../components/LoadingSpinner";
import LibraryFilters from "./components/LibraryFilters";
import { getLibraryGamesPerPage } from "./lib/gamesPerPage";
import { useLibraryQuery } from "./lib/useLibraryQuery";
import { logMeta } from "./lib/logMeta";
import { libraryFoot } from "./lib/libraryFoot";
import { formatCount } from "../../lib/format";

const LibraryPage = () => {
    usePageTitle("Library");

    const { user } = useAuth();
    const { width } = useWindowSize();
    const { query, setQuery } = useLibraryQuery();

    const { data: platforms } = usePlatforms();
    const { data: genres } = useGenres();

    /* The input is local so typing is instant; the query trails it. */
    const [searchDraft, setSearchDraft] = useState(query.search);
    const debouncedSearch = useDebouncedValue(searchDraft, 300);

    useEffect(() => {
        if (debouncedSearch === query.search) return;
        // replace, so the back button doesn't walk every keystroke.
        setQuery({ search: debouncedSearch }, { replace: true });
    }, [debouncedSearch, query.search, setQuery]);

    const perPage = getLibraryGamesPerPage(width);

    const {
        data: page,
        isLoading,
        isFetching,
        isPlaceholderData,
    } = useGames({
        page: query.page,
        limit: perPage,
        search: query.search || undefined,
        platform: query.platform || undefined,
        genre: query.genre || undefined,
        sort: query.sort,
        excludeLogged: user ? query.excludeLogged : false,
    });

    const games = page?.data ?? [];

    /* Nothing here for the search: look past the catalogue, as the
       masthead's search does, and bring back what turns up. */
    const searchTerm = query.search.trim();
    const settledEmpty = !!page && !isPlaceholderData && page.meta.total === 0;
    /* Only near misses ("witchr" for The Witcher) still look further: the
       game meant may be one the catalogue doesn't have yet. */
    const approximate = !!page && !isPlaceholderData && !!page.meta.approximate;
    const { reaching, found } = useCatalogueReach(
        searchTerm,
        !!user && (settledEmpty || approximate)
    );
    // Until the list has been asked again for what was just added.
    const lookingFurther =
        settledEmpty && !!searchTerm && (reaching || (found > 0 && isFetching));
    const total = page?.meta.total ?? 0;

    const pagination = usePagination({
        total,
        perPage,
        page: query.page,
        onPageChange: (next) => setQuery({ page: next }),
    });

    const { actionsFor, statusFor, logFor } = useTileActions();

    const showSkeletons =
        isLoading || (isPlaceholderData && games.length === 0);

    return (
        <section className="flex flex-col gap-6">
            <PageHeader
                title="Library"
                // Not "0 titles" while it loads: that says the library is
                // empty, which it isn't.
                note={
                    page ? (
                        `${formatCount(total)} ${total === 1 ? "title" : "titles"}`
                    ) : (
                        <Skeleton className="mt-0.5 h-3.5 w-24" />
                    )
                }
            />

            <LibraryFilters
                query={query}
                setQuery={setQuery}
                searchDraft={searchDraft}
                onSearchDraft={setSearchDraft}
                platforms={platforms ?? []}
                genres={genres ?? []}
                isSignedIn={!!user}
            />

            {approximate && !showSkeletons && (
                <p
                    role="status"
                    className="flex items-center gap-2 text-body-sm text-content-secondary"
                >
                    {reaching && <LoadingSpinner size="sm" label="Searching" />}
                    Nothing is called “{searchTerm}”, so these are the closest
                    titles.
                </p>
            )}

            {showSkeletons ? (
                <div className="grid grid-cols-3 gap-x-4 gap-y-5 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
                    {Array.from({ length: perPage }, (_, i) => (
                        <TileSkeleton key={i} />
                    ))}
                </div>
            ) : games.length === 0 && lookingFurther ? (
                <EmptyPlate
                    title={`Looking further for “${searchTerm}”`}
                    body="Not in the library yet. Looking for it now."
                    action={<LoadingSpinner size="md" label="Searching" />}
                />
            ) : games.length === 0 ? (
                <EmptyPlate
                    title="No titles match those filters"
                    body="Try a broader search, or clear the platform and genre filters."
                />
            ) : (
                <div
                    className={
                        isPlaceholderData
                            ? "grid grid-cols-3 gap-x-4 gap-y-5 opacity-60 transition-opacity md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7"
                            : "grid grid-cols-3 gap-x-4 gap-y-5 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7"
                    }
                >
                    {games.map((game) => {
                        const log = logFor(game.id);
                        // The grid shows whatever it is ordered by.
                        const foot = libraryFoot(game, query.sort, log);
                        return (
                            <GameTile
                                key={game.id}
                                gameId={game.id}
                                title={game.title}
                                coverUrl={game.coverUrl}
                                platformSlugs={game.platforms}
                                platforms={platforms ?? []}
                                // Brand figure only with a real rating behind it.
                                rating={foot.rating}
                                footValue={foot.value}
                                status={statusFor(game)}
                                meta={logMeta(logFor(game.id))}
                                actions={actionsFor(game)}
                                narrowFoot
                            />
                        );
                    })}
                </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-subtle pt-5">
                <PaginationSummary pagination={pagination} />
                <Pagination
                    pagination={pagination}
                    onChange={() => window.scrollTo({ top: 0 })}
                />
            </div>
        </section>
    );
};

export default LibraryPage;

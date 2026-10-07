import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
    useGames,
    useGenres,
    usePlatforms,
} from "../../hooks/queries/useGames";
import { useMyGameLogIds, useQuickAdd } from "../../hooks/queries/useGameLogs";
import { useLogFlow } from "../../components/gamelog/useLogFlow";
import { useAccountForm } from "../../contexts/AccountFormContext";
import { useWindowSize } from "../../hooks/useWindowSize";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { usePagination } from "../../hooks/usePagination";
import { usePageTitle } from "../../hooks/usePageTitle";
import GameTile, { type TileAction } from "../../components/game/GameTile";
import Pagination, { PaginationSummary } from "../../components/ui/Pagination";
import { Skeleton, TileSkeleton } from "../../components/ui/Skeleton";
import EmptyPlate from "../../components/ui/EmptyPlate";
import LibraryFilters from "./components/LibraryFilters";
import { getLibraryGamesPerPage } from "./lib/gamesPerPage";
import { useLibraryQuery } from "./lib/useLibraryQuery";
import { libraryFoot } from "./lib/libraryFoot";
import {
    STATUS_PRESENTATION,
    displayStatusFor,
} from "../../constants/gameStatus";
import { formatCount, formatRatingOutOfTen } from "../../lib/format";

const LibraryPage = () => {
    usePageTitle("Library");

    const { user } = useAuth();
    const { openLogin } = useAccountForm();
    const { width } = useWindowSize();
    const { query, setQuery } = useLibraryQuery();

    const { data: platforms } = usePlatforms();
    const { data: genres } = useGenres();
    const { data: myLogIds } = useMyGameLogIds();

    const flow = useLogFlow();

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
    const total = page?.meta.total ?? 0;

    const pagination = usePagination({
        total,
        perPage,
        page: query.page,
        onPageChange: (next) => setQuery({ page: next }),
    });

    const logByGameId = useMemo(
        () => new Map((myLogIds ?? []).map((log) => [log.gameId, log])),
        [myLogIds]
    );

    const quickAdd = useQuickAdd();

    const buildActions = (gameId: number, title: string): TileAction[] => {
        if (!user) {
            return [
                {
                    key: "signin",
                    label: "Log in to add",
                    tone: "primary",
                    onSelect: openLogin,
                },
            ];
        }

        const log = logByGameId.get(gameId);
        if (!log) {
            return [
                {
                    key: "log",
                    label: "Create log",
                    tone: "primary",
                    onSelect: () => flow.open(gameId),
                },
                {
                    key: "backlog",
                    label: "Add to backlog",
                    icon: STATUS_PRESENTATION.backlog.icon,
                    onSelect: () => quickAdd(gameId, title, "backlog"),
                    doneLabel: "In your backlog",
                },
                {
                    key: "wishlist",
                    label: "Add to wishlist",
                    icon: STATUS_PRESENTATION.wishlist.icon,
                    onSelect: () => quickAdd(gameId, title, "wishlist"),
                    doneLabel: "On your wishlist",
                },
            ];
        }

        return [
            {
                key: "view",
                label: log.logs.length > 1 ? "View your logs" : "View your log",
                tone: "primary",
                onSelect: () => flow.view(gameId),
            },
            {
                key: "edit",
                label: "Edit",
                onSelect: () => flow.open(gameId),
            },
        ];
    };

    const logMeta = (gameId: number): string | undefined => {
        const log = logByGameId.get(gameId);
        if (!log) return undefined;
        const parts =
            log.logs.length > 1
                ? ["Your logs", `${log.logs.length} platforms`]
                : ["Your log"];
        if (log.rating !== null) parts.push(formatRatingOutOfTen(log.rating));
        return parts.join(" · ");
    };

    const showSkeletons =
        isLoading || (isPlaceholderData && games.length === 0);

    return (
        <section className="flex flex-col gap-6">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="font-display text-title text-content">
                        Library
                    </h1>
                    {/* Not "0 titles" while it loads: that says the library
                        is empty, which it isn't. */}
                    {page ? (
                        <p className="mt-2 text-label text-content-muted">
                            {formatCount(total)}{" "}
                            {total === 1 ? "title" : "titles"}
                        </p>
                    ) : (
                        <Skeleton className="mt-2.5 h-3.5 w-24" />
                    )}
                </div>
            </header>

            <LibraryFilters
                query={query}
                setQuery={setQuery}
                searchDraft={searchDraft}
                onSearchDraft={setSearchDraft}
                platforms={platforms ?? []}
                genres={genres ?? []}
                isSignedIn={!!user}
            />

            {showSkeletons ? (
                <div className="grid grid-cols-3 gap-x-4 gap-y-5 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
                    {Array.from({ length: perPage }, (_, i) => (
                        <TileSkeleton key={i} />
                    ))}
                </div>
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
                        const log = logByGameId.get(game.id);
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
                                status={
                                    log
                                        ? displayStatusFor(
                                              log.status,
                                              log.playedStatus
                                          )
                                        : null
                                }
                                meta={logMeta(game.id)}
                                actions={buildActions(game.id, game.title)}
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

import { useEffect, useMemo, useState } from "react";
import type { GameLogWithGame } from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import {
    useGames,
    useGenres,
    usePlatforms,
} from "../../hooks/queries/useGames";
import {
    useGameLogMutations,
    useMyGameLogIds,
    useMyGameLogs,
} from "../../hooks/queries/useGameLogs";
import { useAccountForm } from "../../contexts/AccountFormContext";
import { useNotify } from "../../contexts/NotificationContext";
import { useWindowSize } from "../../hooks/useWindowSize";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { usePagination } from "../../hooks/usePagination";
import GameTile, { type TileAction } from "../../components/game/GameTile";
import Pagination, {
    PaginationSummary,
} from "../../components/ui/Pagination";
import { TileSkeleton } from "../../components/ui/Skeleton";
import EmptyPlate from "../../components/ui/EmptyPlate";
import ViewGameLogPopup from "../../components/ViewGameLogPopup";
import CreateOrEditGameLogPopup from "../../components/CreateOrEditGameLogPopup";
import LibraryFilters from "./components/LibraryFilters";
import { getLibraryGamesPerPage } from "./lib/gamesPerPage";
import { useLibraryQuery } from "./lib/useLibraryQuery";
import { displayStatusFor } from "../../constants/gameStatus";
import { primaryPlatformLabel } from "../../lib/platforms";
import {
    formatCount,
    formatRating,
    releaseYear,
} from "../../lib/format";

type OpenModal =
    | { kind: "view"; log: GameLogWithGame }
    | { kind: "edit"; log: GameLogWithGame }
    | { kind: "create"; gameId: number }
    | null;

const LibraryPage = () => {
    const { user } = useAuth();
    const { openLogin } = useAccountForm();
    const notify = useNotify();
    const { width } = useWindowSize();
    const { query, setQuery } = useLibraryQuery();

    const { data: platforms } = usePlatforms();
    const { data: genres } = useGenres();
    const { data: myLogIds } = useMyGameLogIds();
    const { save } = useGameLogMutations();

    const [modal, setModal] = useState<OpenModal>(null);

    /* The input is local so typing is instant; the query trails it. */
    const [searchDraft, setSearchDraft] = useState(query.search);
    const debouncedSearch = useDebouncedValue(searchDraft, 300);

    useEffect(() => {
        if (debouncedSearch === query.search) return;
        // replace, so the back button doesn't walk every keystroke.
        setQuery({ search: debouncedSearch }, { replace: true });
    }, [debouncedSearch, query.search, setQuery]);

    const perPage = getLibraryGamesPerPage(width);

    const { data: page, isLoading, isPlaceholderData } = useGames({
        page: query.page,
        limit: perPage,
        search: query.search || undefined,
        platform: query.platform || undefined,
        genre: query.genre || undefined,
        sort: query.sort,
        includeAdult: query.includeAdult,
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

    /* The full log is only needed once a modal opens, so it is fetched
       lazily rather than alongside the grid. */
    const { data: myLogs } = useMyGameLogs(undefined, { limit: 100 });
    const fullLog = (gameId: number) =>
        (myLogs?.data ?? []).find((log) => log.gameId === gameId);

    const wishlist = async (gameId: number, title: string) => {
        try {
            await save.mutateAsync({ gameId, input: { status: "wishlist" } });
            notify(`${title} added to your wishlist`, "success");
        } catch {
            notify("Couldn't add that to your wishlist", "error");
        }
    };

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
                    label: "Log it",
                    tone: "primary",
                    onSelect: () => setModal({ kind: "create", gameId }),
                },
                {
                    key: "wishlist",
                    label: "Wishlist",
                    onSelect: () => void wishlist(gameId, title),
                },
            ];
        }

        return [
            {
                key: "view",
                label: "View your log",
                tone: "primary",
                onSelect: () => {
                    const full = fullLog(gameId);
                    if (full) setModal({ kind: "view", log: full });
                },
            },
            {
                key: "edit",
                label: "Edit",
                onSelect: () => {
                    const full = fullLog(gameId);
                    if (full) setModal({ kind: "edit", log: full });
                },
            },
        ];
    };

    const logMeta = (gameId: number): string | undefined => {
        const log = logByGameId.get(gameId);
        if (!log) return undefined;
        const parts = ["Your log"];
        if (log.rating !== null) parts.push(formatRating(log.rating));
        return parts.join(" · ");
    };

    const showSkeletons = isLoading || (isPlaceholderData && games.length === 0);

    return (
        <section className="flex flex-col gap-6">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="font-display text-title text-content">
                        The catalogue
                    </h1>
                    <p className="mt-2 text-label text-content-muted">
                        {formatCount(total)} titles
                    </p>
                </div>
            </header>

            <LibraryFilters
                query={query}
                setQuery={setQuery}
                searchDraft={searchDraft}
                onSearchDraft={setSearchDraft}
                matches={page?.meta.total}
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
                    eyebrow="Nothing on file"
                    title="No titles match those filters"
                    body="Try a broader search, or clear the platform and genre filters — the catalogue holds a hundred thousand games, so something in here fits."
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
                        return (
                            <GameTile
                                key={game.id}
                                gameId={game.id}
                                title={game.title}
                                coverUrl={game.coverUrl}
                                footLabel={primaryPlatformLabel(
                                    game.platforms,
                                    platforms ?? []
                                )}
                                /* Only show the brand figure when there is a
                                   real rating behind it; otherwise the year. */
                                rating={log ? log.rating : undefined}
                                footValue={releaseYear(game.releaseDate)}
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
                            />
                        );
                    })}
                </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-strong pt-4">
                <PaginationSummary pagination={pagination} />
                <Pagination
                    pagination={pagination}
                    onChange={() => window.scrollTo({ top: 0 })}
                />
            </div>

            {modal?.kind === "view" && (
                <ViewGameLogPopup
                    gamelog={modal.log}
                    closePopup={() => setModal(null)}
                    /* This modal only opens from the "View your log" tile
                       action, which only exists for the viewer's own logs. */
                    primaryAction={{
                        label: "Edit",
                        onSelect: () =>
                            setModal({ kind: "edit", log: modal.log }),
                    }}
                />
            )}

            {(modal?.kind === "edit" || modal?.kind === "create") && (
                <CreateOrEditGameLogPopup
                    closePopup={() => setModal(null)}
                    viewUpdatedLog={() => setModal(null)}
                    gamelog={modal.kind === "edit" ? modal.log : null}
                    gameID={
                        modal.kind === "create" ? modal.gameId : undefined
                    }
                    editing={modal.kind === "edit"}
                />
            )}
        </section>
    );
};

export default LibraryPage;

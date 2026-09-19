import { useMemo, useState } from "react";
import type { GameLogWithGame } from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import { useGames, usePlatforms } from "../../hooks/queries/useGames";
import { useMyGameLogs } from "../../hooks/queries/useGameLogs";
import { useWindowSize } from "../../hooks/useWindowSize";
import { usePagination } from "../../hooks/usePagination";
import GameTile, { type TileAction } from "../../components/game/GameTile";
import Pagination from "../../components/ui/Pagination";
import ViewGameLogPopup from "../../components/ViewGameLogPopup";
import CreateOrEditGameLogPopup from "../../components/CreateOrEditGameLogPopup";
import LoadingSpinner from "../../components/LoadingSpinner";
import { getLibraryGamesPerPage } from "./lib/gamesPerPage";

type OpenModal =
    | { kind: "view"; log: GameLogWithGame }
    | { kind: "edit"; log: GameLogWithGame }
    | { kind: "create"; gameId: number }
    | null;

const LibraryPage = () => {
    const { user } = useAuth();
    const { width, height } = useWindowSize();
    const { data: platforms } = usePlatforms();

    // filter values
    const [includeLogged, setIncludeLogged] = useState(true);
    const [includeAdult, setIncludeAdult] = useState(false);
    const [search, setSearch] = useState("");
    const [platform, setPlatform] = useState("all");

    const [modal, setModal] = useState<OpenModal>(null);

    const { data: gamesPage, isLoading: gamesLoading } = useGames({
        limit: 100,
    });
    const { data: logsPage, isLoading: logsLoading } = useMyGameLogs();

    const games = useMemo(() => gamesPage?.data ?? [], [gamesPage]);
    const logs = useMemo(() => logsPage?.data ?? [], [logsPage]);

    const logByGameId = useMemo(
        () => new Map(logs.map((log) => [log.gameId, log])),
        [logs]
    );

    const filteredGames = useMemo(
        () =>
            games
                .filter((game) =>
                    includeLogged ? true : !logByGameId.has(game.id)
                )
                .filter((game) =>
                    search
                        ? game.title
                              .toLowerCase()
                              .includes(search.toLowerCase())
                        : true
                )
                .filter((game) =>
                    platform === "all"
                        ? true
                        : game.platforms.includes(platform)
                )
                .filter((game) => (includeAdult ? true : !game.isAdult)),
        [games, includeLogged, includeAdult, search, platform, logByGameId]
    );

    const gamesPerPage = getLibraryGamesPerPage(width, height);
    const pagination = usePagination({
        total: filteredGames.length,
        perPage: gamesPerPage,
    });

    const visibleGames = pagination.slice(filteredGames);

    const buildActions = (gameId: number): TileAction[] => {
        if (!user) return [];
        const log = logByGameId.get(gameId);

        if (log) {
            return [
                {
                    key: "view",
                    label: "View",
                    icon: "fas fa-eye",
                    onSelect: () => setModal({ kind: "view", log }),
                },
                {
                    key: "edit",
                    label: "Edit",
                    icon: "fas fa-pen-to-square",
                    onSelect: () => setModal({ kind: "edit", log }),
                },
            ];
        }

        return [
            {
                key: "add",
                label: "Add",
                icon: "fas fa-add",
                onSelect: () => setModal({ kind: "create", gameId }),
            },
        ];
    };

    return (
        <section className="flex w-full gap-4">
            {/* Filters, larger screens */}
            <aside className="card hidden h-[85vh] min-w-[320px] max-w-[320px] flex-col gap-6 font-lexend lg:flex">
                <div className="flex w-full flex-col gap-4">
                    <h2 className="card-header-text">Filters</h2>
                    <input
                        type="text"
                        placeholder="Search for game..."
                        aria-label="Search for a game"
                        className="search-bar h-11 w-full"
                        value={search}
                        onChange={(e) => setSearch(e.currentTarget.value)}
                    />
                </div>

                <div className="flex w-full flex-col gap-4">
                    <span className="flex gap-2">
                        <input
                            id="include-logged"
                            type="checkbox"
                            checked={includeLogged}
                            onChange={(e) =>
                                setIncludeLogged(e.currentTarget.checked)
                            }
                            disabled={!user}
                        />
                        <label
                            htmlFor="include-logged"
                            className="font-light text-content"
                        >
                            Include already logged games?
                        </label>
                    </span>

                    <span className="flex gap-2">
                        <input
                            id="include-adult"
                            type="checkbox"
                            checked={includeAdult}
                            onChange={(e) =>
                                setIncludeAdult(e.currentTarget.checked)
                            }
                        />
                        <label
                            htmlFor="include-adult"
                            className="font-light text-content"
                        >
                            Include 18+ age-rated games?
                        </label>
                    </span>

                    <div className="flex flex-col gap-0.5">
                        <label
                            htmlFor="platform-filter"
                            className="text-sm font-semibold text-content"
                        >
                            Platform
                        </label>
                        <select
                            id="platform-filter"
                            className="dropdown-input h-11 w-full"
                            value={platform}
                            onChange={(e) => setPlatform(e.currentTarget.value)}
                        >
                            <option value="all">All Platforms</option>
                            {(platforms ?? []).map((p) => (
                                <option key={p.slug} value={p.slug}>
                                    {p.displayName}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </aside>

            {gamesLoading || logsLoading ? (
                <span className="mx-auto flex h-[85vh] w-max flex-row items-center justify-center gap-6">
                    <LoadingSpinner size="md" />
                    <p className="font-lexend text-xl tracking-wide text-content">
                        Loading Games...
                    </p>
                </span>
            ) : (
                <div className="flex w-full flex-col gap-3 lg:h-[85vh]">
                    <div className="card w-full space-y-4 font-lexend">
                        <div className="w-full space-y-1">
                            <h2 className="card-header-text text-center">
                                Game Library
                            </h2>
                            <p className="text-center text-content-secondary">
                                You can{" "}
                                <span className="font-semibold">view</span>,{" "}
                                <span className="font-semibold">create</span>,
                                and <span className="font-semibold">edit</span>{" "}
                                your game logs all within this page!
                            </p>
                        </div>
                        {width < 1024 ? (
                            <span className="flex w-full flex-col gap-3 font-lexend md:flex-row">
                                <span className="relative h-max w-full">
                                    {/* now wired to the same filter state the
                                        sidebar search uses */}
                                    <input
                                        type="text"
                                        placeholder="Search for game..."
                                        aria-label="Search for a game"
                                        className="search-bar h-12 w-full"
                                        value={search}
                                        onChange={(e) =>
                                            setSearch(e.currentTarget.value)
                                        }
                                    />
                                    <i
                                        className="fas fa-magnifying-glass absolute right-1 top-1/2 -translate-y-1/2 transform p-2 text-content-muted transition-colors hover:cursor-pointer hover:text-brand"
                                        aria-hidden="true"
                                    ></i>
                                </span>
                                <button className="button-outline button-outline-default flex h-12 w-full min-w-36 items-center justify-center gap-3 md:w-max">
                                    Filters
                                    <i
                                        className="fas fa-filter"
                                        aria-hidden="true"
                                    ></i>
                                </button>
                            </span>
                        ) : (
                            <></>
                        )}
                    </div>

                    <div className="flex w-full flex-grow flex-col justify-between">
                        <div className="flex flex-wrap justify-center gap-1 lg:grid lg:grid-cols-[repeat(auto-fill,minmax(105px,1fr))]">
                            {visibleGames.map((game) => (
                                <GameTile
                                    key={game.id}
                                    gameId={game.id}
                                    title={game.title}
                                    coverUrl={game.coverUrl}
                                    variant="library"
                                    showMenu={!!user}
                                    actions={buildActions(game.id)}
                                    popupIsVisible={modal !== null}
                                />
                            ))}
                        </div>

                        <Pagination
                            pagination={pagination}
                            onChange={() => window.scrollTo(0, 0)}
                        />
                    </div>
                </div>
            )}

            {modal?.kind === "view" && (
                <ViewGameLogPopup
                    closePopup={() => setModal(null)}
                    isMyAccount={true}
                    userLoggedIn={!!user}
                    gamelog={modal.log}
                    openEdit={() => setModal({ kind: "edit", log: modal.log })}
                    openCreate={() =>
                        setModal({ kind: "create", gameId: modal.log.gameId })
                    }
                    currentUserSharesLog={true}
                    redirectAndOpenView={() => {}}
                    profilePage={false}
                />
            )}

            {modal?.kind === "create" && (
                <CreateOrEditGameLogPopup
                    closePopup={() => setModal(null)}
                    editing={false}
                    gameID={modal.gameId}
                    viewUpdatedLog={() => setModal(null)}
                />
            )}

            {modal?.kind === "edit" && (
                <CreateOrEditGameLogPopup
                    closePopup={() => setModal(null)}
                    gamelog={modal.log}
                    editing={true}
                    viewUpdatedLog={() => setModal(null)}
                />
            )}
        </section>
    );
};

export default LibraryPage;

import { GAME_STATUSES } from "@playrates/shared";
import type { GameLogWithGame } from "../../../api";
import GameTile, { type TileAction } from "../../../components/game/GameTile";
import LoadingSpinner from "../../../components/LoadingSpinner";
import Pagination from "../../../components/ui/Pagination";
import type { PaginationState } from "../../../hooks/usePagination";
import { capitalise } from "../../../lib/format";

interface GameLibraryPanelProps {
    activeSection: string;
    onSelectSection: (section: string) => void;
    /** Already filtered to the active section and sliced to the page. */
    visibleLogs: GameLogWithGame[];
    isLoading: boolean;
    isEmpty: boolean;
    pagination: PaginationState;
    buildTileActions: (log: GameLogWithGame) => TileAction[];
    /** Suppresses tile hover menus while a modal is open. */
    isModalOpen: boolean;
    isCompact: boolean;
    onOpenMobileSearch: () => void;
    onOpenMobileSections: () => void;
}

const GameLibraryPanel = ({
    activeSection,
    onSelectSection,
    visibleLogs,
    isLoading,
    isEmpty,
    pagination,
    buildTileActions,
    isModalOpen,
    isCompact,
    onOpenMobileSearch,
    onOpenMobileSections,
}: GameLibraryPanelProps) => (
    <div className="card relative w-full lg:flex-grow">
        <div className="flex w-full justify-between">
            <h2 className="card-header-text">Game Library</h2>

            <div className="flex items-center gap-4 md:gap-5">
                <i
                    className="fas fa-list hover-text-white text-xl md:hidden"
                    title="Game Section"
                    onClick={onOpenMobileSections}
                ></i>
                <i
                    className="fas fa-filter hover-text-white text-xl md:hidden"
                    title="Filters"
                ></i>
                <button className="hover-text-white button-outline hidden h-11 items-center gap-3 hover:border-brand md:flex">
                    <p className="font-lexend">Filters</p>
                    <i className="fas fa-filter" title="Filters"></i>
                </button>
                <span className="relative">
                    <input
                        type="text"
                        placeholder="Search for game..."
                        aria-label="Search this library"
                        className="search-bar hidden h-11 w-60 md:block xl:w-72"
                    />
                    <i
                        className="fas fa-magnifying-glass relative text-xl text-content transition-colors hover:cursor-pointer hover:text-brand md:absolute md:right-1 md:top-1/2 md:-translate-y-1/2 md:transform md:p-2 md:text-base md:text-content-muted"
                        title="Search"
                        onClick={() => {
                            if (isCompact) onOpenMobileSearch();
                        }}
                    ></i>
                </span>
            </div>
        </div>

        {/* Section tabs: played / playing / backlog / wishlist */}
        <div className="mx-auto mt-12 hidden w-max font-lexend text-lg text-content md:flex">
            {GAME_STATUSES.map((sectionName) => (
                <p
                    key={sectionName}
                    onClick={() => onSelectSection(sectionName)}
                    className={`w-36 border-b-4 pb-2 text-center 2xl:w-40 ${
                        activeSection === sectionName
                            ? "border-b-brand-hover"
                            : "border-b-subtle hover:border-b-brand"
                    } transition-colors hover:cursor-pointer hover:text-brand-hover`}
                >
                    {capitalise(sectionName)}
                </p>
            ))}
        </div>

        {isEmpty ? (
            <h2 className="mt-16 text-center font-lexend text-2xl text-content-secondary">
                No games found in {activeSection}...
            </h2>
        ) : isLoading ? (
            <span className="mt-16 flex items-center justify-center gap-4">
                <LoadingSpinner size="md" />
                <p className="font-lexend text-xl tracking-wide text-content">
                    Loading Game Logs...
                </p>
            </span>
        ) : (
            <div className="mt-6 flex w-full flex-wrap justify-center">
                {visibleLogs.map((gameLog) => (
                    <GameTile
                        key={gameLog.id}
                        gameId={gameLog.gameId}
                        title={gameLog.game?.title ?? ""}
                        coverUrl={gameLog.game?.coverUrl ?? null}
                        variant="profile"
                        showMenu
                        actions={buildTileActions(gameLog)}
                        popupIsVisible={isModalOpen}
                    />
                ))}
            </div>
        )}

        <div className="lg:absolute lg:bottom-6 lg:left-1/2 lg:-translate-x-1/2 lg:transform">
            <Pagination pagination={pagination} />
        </div>
    </div>
);

export default GameLibraryPanel;

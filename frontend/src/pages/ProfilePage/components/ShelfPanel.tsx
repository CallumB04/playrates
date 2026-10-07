import { Link } from "react-router-dom";
import { cardClass } from "../../../components/ui/Card";
import { headlineOf, type ShelfEntry } from "@playrates/shared";
import type { GameLogSort, Platform } from "@playrates/shared";
import type { GameStatus } from "../../../constants/gameStatus";
import type { PaginationState } from "../../../hooks/usePagination";
import GameTile, { type TileAction } from "../../../components/game/GameTile";
import Pagination from "../../../components/ui/Pagination";
import { buttonClass } from "../../../components/ui/Button";
import { TileSkeleton } from "../../../components/ui/Skeleton";
import EmptyPlate from "../../../components/ui/EmptyPlate";
import DrawerTabs from "./DrawerTabs";
import { displayStatusFor } from "../../../constants/gameStatus";
import { formatCount } from "../../../lib/format";
import { shelfFoot } from "../lib/shelfSort";
import type { ReactNode } from "react";

interface ShelfPanelProps {
    active: GameStatus;
    counts: Partial<Record<GameStatus, number>>;
    onSelect: (status: GameStatus) => void;
    entries: ShelfEntry[];
    platforms: Platform[];
    isLoading: boolean;
    pagination: PaginationState;
    perPage: number;
    buildTileActions: (entry: ShelfEntry) => TileAction[];
    isMyAccount: boolean;
    /** Decides the figure each tile prints, as well as the order. */
    sort: GameLogSort;
    trailing?: ReactNode;
}

// Every empty shelf sends you somewhere.
const EMPTY_COPY: Record<
    GameStatus,
    { title: string; body: string; cta: string }
> = {
    played: {
        title: "No played games yet",
        body: "Games you mark as played appear here.",
        cta: "Find a game to log",
    },
    playing: {
        title: "Nothing in progress",
        body: "Games you mark as playing appear here.",
        cta: "Find a game to log",
    },
    backlog: {
        title: "Your backlog is empty",
        body: "Games you add to your backlog appear here.",
        cta: "Browse the library",
    },
    wishlist: {
        title: "Your wishlist is empty",
        body: "Games you add to your wishlist appear here.",
        cta: "Browse the library",
    },
};

/** Tabs, grid and pagination — the drawer and its contents. */
const ShelfPanel = ({
    active,
    counts,
    onSelect,
    entries,
    platforms,
    isLoading,
    pagination,
    perPage,
    buildTileActions,
    isMyAccount,
    sort,
    trailing,
}: ShelfPanelProps) => {
    const empty = EMPTY_COPY[active];

    return (
        <section>
            <DrawerTabs
                active={active}
                counts={counts}
                onSelect={onSelect}
                trailing={trailing}
            />

            <div className={cardClass("mt-3 p-5", { padding: "none" })}>
                {isLoading ? (
                    <div className="grid grid-cols-2 gap-x-3.5 gap-y-4 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-7">
                        {Array.from(
                            { length: Math.min(perPage, 14) },
                            (_, i) => (
                                <TileSkeleton key={i} />
                            )
                        )}
                    </div>
                ) : entries.length === 0 ? (
                    <EmptyPlate
                        title={empty.title}
                        body={isMyAccount ? empty.body : "Nothing here yet."}
                        action={
                            isMyAccount ? (
                                <Link
                                    to="/library"
                                    className={buttonClass("primary")}
                                >
                                    {empty.cta}
                                </Link>
                            ) : undefined
                        }
                    />
                ) : (
                    <div className="grid grid-cols-2 gap-x-3.5 gap-y-4 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-7">
                        {entries.map((entry) => {
                            // The shelf shows whatever it is ordered by.
                            const foot = shelfFoot(entry, sort);
                            // The best ending of its played runs.
                            const played = headlineOf(
                                entry.logs.filter((l) => l.status === "played")
                            );
                            /* The consoles it was logged on, where the logs
                               say; the game's own where none do. */
                            const logged = [
                                ...new Set(
                                    entry.logs
                                        .map((l) => l.platform)
                                        .filter((p): p is string => !!p)
                                ),
                            ];

                            return (
                                <GameTile
                                    key={entry.gameId}
                                    gameId={entry.gameId}
                                    title={entry.game?.title ?? "Unknown game"}
                                    coverUrl={entry.game?.coverUrl ?? null}
                                    platformSlugs={
                                        logged.length > 0
                                            ? logged
                                            : (entry.game?.platforms ?? [])
                                    }
                                    platforms={platforms}
                                    rating={foot.rating}
                                    footValue={foot.value}
                                    // Only the played tab carries a substatus.
                                    status={
                                        active === "played" && played
                                            ? displayStatusFor(
                                                  played.status,
                                                  played.playedStatus
                                              )
                                            : null
                                    }
                                    actions={buildTileActions(entry)}
                                />
                            );
                        })}
                    </div>
                )}
            </div>

            {pagination.total > 0 && (
                <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-label text-content-muted">
                        Entries{" "}
                        {formatCount((pagination.page - 1) * perPage + 1)}–
                        {formatCount(
                            Math.min(
                                pagination.page * perPage,
                                pagination.total
                            )
                        )}{" "}
                        of {formatCount(pagination.total)}
                    </p>
                    <Pagination pagination={pagination} />
                </div>
            )}
        </section>
    );
};

export default ShelfPanel;

import type { GameLogWithGame } from "../../../api";
import type { Platform } from "@playrates/shared";
import type { GameStatus } from "../../../constants/gameStatus";
import type { PaginationState } from "../../../hooks/usePagination";
import GameTile, { type TileAction } from "../../../components/game/GameTile";
import Pagination from "../../../components/ui/Pagination";
import { TileSkeleton } from "../../../components/ui/Skeleton";
import EmptyPlate, { GhostTile } from "../../../components/ui/EmptyPlate";
import DrawerTabs from "./DrawerTabs";
import { displayStatusFor } from "../../../constants/gameStatus";
import { primaryPlatformLabel } from "../../../lib/platforms";
import { formatCount } from "../../../lib/format";
import type { ReactNode } from "react";

interface ShelfPanelProps {
    active: GameStatus;
    counts: Partial<Record<GameStatus, number>>;
    onSelect: (status: GameStatus) => void;
    logs: GameLogWithGame[];
    platforms: Platform[];
    isLoading: boolean;
    pagination: PaginationState;
    perPage: number;
    buildTileActions: (log: GameLogWithGame) => TileAction[];
    isMyAccount: boolean;
    trailing?: ReactNode;
}

const EMPTY_COPY: Record<GameStatus, { title: string; body: string }> = {
    played: {
        title: "Nothing played yet",
        body: "Log the last game you finished — even if that was years ago. The shelf is more useful honest than current.",
    },
    playing: {
        title: "Nothing on the go",
        body: "Mark a game as playing and it shows up here, with the hours as you add them.",
    },
    backlog: {
        title: "The backlog is empty",
        body: "Enviable. Add the games you mean to get to and this becomes the list you actually work through.",
    },
    wishlist: {
        title: "Nothing on the wishlist",
        body: "Wishlist a game from the catalogue and it waits here until you pick it up.",
    },
};

/** Tabs, grid and pagination — the drawer and its contents. */
const ShelfPanel = ({
    active,
    counts,
    onSelect,
    logs,
    platforms,
    isLoading,
    pagination,
    perPage,
    buildTileActions,
    isMyAccount,
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

            <div className="rounded-b-lg rounded-tr-lg border border-t-0 border-subtle bg-surface-raised p-5 shadow-plate">
                {isLoading ? (
                    <div className="grid grid-cols-3 gap-x-3.5 gap-y-4 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-7">
                        {Array.from({ length: Math.min(perPage, 14) }, (_, i) => (
                            <TileSkeleton key={i} />
                        ))}
                    </div>
                ) : logs.length === 0 ? (
                    <div className="flex flex-col gap-5">
                        <EmptyPlate
                            eyebrow="Nothing here yet"
                            title={empty.title}
                            body={isMyAccount ? empty.body : "Nothing here yet."}
                        />
                        {isMyAccount && (
                            // The shelf shows you what it will look like.
                            <div className="grid grid-cols-3 gap-3.5 sm:grid-cols-5 xl:grid-cols-7">
                                <GhostTile />
                                <GhostTile />
                                <GhostTile className="hidden sm:block" />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-x-3.5 gap-y-4 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-7">
                        {logs.map((log) => (
                            <GameTile
                                key={log.id}
                                gameId={log.gameId}
                                title={log.game?.title ?? "Unknown game"}
                                coverUrl={log.game?.coverUrl ?? null}
                                footLabel={primaryPlatformLabel(
                                    log.game?.platforms ?? [],
                                    platforms
                                )}
                                rating={log.rating}
                                /* Only the played tab carries a substatus —
                                   the other tabs already say what they are. */
                                status={
                                    active === "played"
                                        ? displayStatusFor(
                                              log.status,
                                              log.playedStatus
                                          )
                                        : null
                                }
                                actions={buildTileActions(log)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {pagination.total > 0 && (
                <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-label text-content-muted">
                        Entries{" "}
                        {formatCount((pagination.page - 1) * perPage + 1)}–
                        {formatCount(
                            Math.min(pagination.page * perPage, pagination.total)
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

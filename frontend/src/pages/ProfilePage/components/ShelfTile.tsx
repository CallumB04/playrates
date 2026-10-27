import { headlineOf, type ShelfEntry } from "@playrates/shared";
import type { GameLogSort, Platform } from "@playrates/shared";
import GameTile, { type TileAction } from "../../../components/game/GameTile";
import {
    displayStatusFor,
    type GameStatus,
} from "../../../constants/gameStatus";
import { shelfFoot } from "../lib/shelfSort";

interface ShelfTileProps {
    entry: ShelfEntry;
    /** The shelf it sits on. Only the played shelf carries a substatus. */
    shelf: GameStatus;
    /** Decides the figure under the cover. */
    sort: GameLogSort;
    platforms: Platform[];
    actions: TileAction[];
}

/** One game on somebody's shelf. */
const ShelfTile = ({
    entry,
    shelf,
    sort,
    platforms,
    actions,
}: ShelfTileProps) => {
    // The shelf shows whatever it is ordered by.
    const foot = shelfFoot(entry, sort);
    // The best ending of its played runs.
    const played = headlineOf(entry.logs.filter((l) => l.status === "played"));
    /* The consoles it was logged on, where the logs say; the game's own
       where none do. */
    const logged = [
        ...new Set(
            entry.logs.map((l) => l.platform).filter((p): p is string => !!p)
        ),
    ];

    return (
        <GameTile
            gameId={entry.gameId}
            title={entry.game?.title ?? "Unknown game"}
            coverUrl={entry.game?.coverUrl ?? null}
            platformSlugs={
                logged.length > 0 ? logged : (entry.game?.platforms ?? [])
            }
            platforms={platforms}
            rating={foot.rating}
            footValue={foot.value}
            status={
                shelf === "played" && played
                    ? displayStatusFor(played.status, played.playedStatus)
                    : null
            }
            actions={actions}
        />
    );
};

export default ShelfTile;

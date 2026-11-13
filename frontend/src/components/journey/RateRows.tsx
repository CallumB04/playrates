import { useEffect, useState } from "react";
import GameCover from "../game/GameCover";
import RatingMeter from "../ui/RatingMeter";
import Skeleton from "../ui/Skeleton";
import { logOnShelf, type GameLogWithGame } from "../../api";
import { useLogMutations, useMyShelf } from "../../hooks/queries/useGameLogs";

/** As many as fit a screen without it becoming homework. */
const ASKED = 6;

/**
 * Their played games without a rating, each with a meter that saves as
 * it's set. Read back from the shelf, so a reload loses nothing; held as
 * first read, so a game doesn't leave the list as it's rated.
 */
const RateRows = ({
    preview = false,
    onRated,
    onEmpty,
}: {
    /** Shows the meters but saves nothing, for the admin preview. */
    preview?: boolean;
    /** How many have a rating now. */
    onRated?: (count: number) => void;
    /** There turned out to be nothing to rate. */
    onEmpty?: () => void;
}) => {
    const { data, isFetching } = useMyShelf("played", { limit: 12 });
    const { patch } = useLogMutations();
    const [ratings, setRatings] = useState<Record<number, number | null>>({});
    /* Not from a copy kept from before the last change to the shelf:
       that one could say there was nothing to rate. */
    const [rows, setRows] = useState<GameLogWithGame[] | null>(null);
    if (rows === null && data && !isFetching) {
        setRows(
            data.data
                .flatMap((entry) => {
                    const log = logOnShelf(entry, "played");
                    return log?.game && log.rating === null ? [log] : [];
                })
                .slice(0, ASKED)
        );
    }
    useEffect(() => {
        if (rows?.length === 0) onEmpty?.();
    }, [rows, onEmpty]);

    const rate = (log: GameLogWithGame, rating: number | null) => {
        const next = { ...ratings, [log.id]: rating };
        setRatings(next);
        onRated?.(Object.values(next).filter((r) => r !== null).length);
        if (!preview) patch.mutate({ logId: log.id, input: { rating } });
    };

    if (rows?.length === 0) return null;

    return (
        <ul className="flex flex-col divide-y divide-subtle rounded-lg border border-subtle bg-surface-raised">
            {rows === null
                ? Array.from({ length: 3 }, (_, i) => (
                      <li key={i} className="flex items-center gap-3 p-3">
                          <Skeleton className="aspect-3/4 w-11 rounded-xs" />
                          <Skeleton className="h-4 w-2/3" />
                      </li>
                  ))
                : rows.map((log) => (
                      <li
                          key={log.id}
                          className="flex items-center gap-3 p-3 sm:gap-4"
                      >
                          <GameCover
                              coverUrl={log.game!.coverUrl}
                              title={log.game!.title}
                              className="aspect-3/4 w-11 shrink-0 overflow-hidden rounded-xs"
                          />
                          <RatingMeter
                              value={ratings[log.id] ?? null}
                              onChange={(value) => rate(log, value)}
                              label={log.game!.title}
                              titled
                              hint={false}
                              className="min-w-0 flex-1"
                          />
                      </li>
                  ))}
        </ul>
    );
};

export default RateRows;

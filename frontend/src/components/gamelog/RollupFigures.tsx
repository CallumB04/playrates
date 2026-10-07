import type { GameLogRollup } from "@playrates/shared";
import { formatHours } from "../../lib/format";
import { cn } from "../../lib/cn";
import Stat from "../ui/Stat";
import RatingBadge from "../ui/RatingBadge";
import { usePlayedOn } from "./usePlayedOn";

interface RollupFiguresProps {
    rollup: GameLogRollup;
    /** "Your" or "Their", for whose rating it is. */
    whose: "Your" | "Their";
    /** The grid's columns, for a narrow column that can't take four. */
    columns?: string;
    className?: string;
}

/** A game's logs added up across consoles: the figures a player wants once
 *  they've played it on more than one. */
const RollupFigures = ({
    rollup,
    whose,
    columns = "grid-cols-2 sm:grid-cols-4",
    className,
}: RollupFiguresProps) => {
    const playedOn = usePlayedOn();
    const quickest = rollup.quickestBeat;
    const quickestOn = quickest
        ? playedOn({ system: quickest.system, platform: null }).name
        : null;

    return (
        <div className={cn("grid gap-x-4 gap-y-5", columns, className)}>
            <Stat
                label="Hours, all platforms"
                value={formatHours(rollup.hoursPlayed)}
            />
            <Stat
                // The console's name is the point, so it isn't cut off.
                wrapLabel
                label={
                    quickestOn
                        ? `Quickest beat · ${quickestOn}`
                        : "Quickest beat"
                }
                value={formatHours(quickest?.hours)}
            />
            <Stat
                label={
                    rollup.ratedCount > 1
                        ? `${whose} average of ${rollup.ratedCount}`
                        : `${whose} rating`
                }
                value={<RatingBadge value={rollup.rating} size="md" />}
            />
            <Stat label="Platforms" value={rollup.logCount} />
        </div>
    );
};

export default RollupFigures;

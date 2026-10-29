import type { ListCover } from "@playrates/shared";
import { cn } from "../../lib/cn";
import GameCover from "./GameCover";

interface CoverGridProps {
    /** The first four are drawn; fewer fill the picture between them. */
    covers: ListCover[];
    className?: string;
}

/* How the picture is split for each count, so a short list isn't mostly
   empty wells: one fills it, two share it, three are one large and two
   small, four are two by two. */
const LAYOUT: Record<number, { grid: string; first?: string }> = {
    1: { grid: "grid-cols-1 grid-rows-1" },
    2: { grid: "grid-cols-2 grid-rows-1" },
    3: { grid: "grid-cols-2 grid-rows-2", first: "row-span-2" },
    4: { grid: "grid-cols-2 grid-rows-2" },
};

/** A list's picture: up to four covers in the shape of one cover. */
const CoverGrid = ({ covers, className }: CoverGridProps) => {
    const shown = covers.slice(0, 4);
    const layout = LAYOUT[shown.length];
    return (
        <div
            aria-hidden
            className={cn(
                "grid aspect-3/4 gap-px overflow-hidden rounded-sm bg-subtle",
                layout?.grid ?? "grid-cols-1",
                className
            )}
        >
            {shown.length === 0 ? (
                <div className="bg-surface-sunken" />
            ) : (
                shown.map((cover, i) => (
                    <GameCover
                        key={cover.id}
                        coverUrl={cover.coverUrl}
                        title={cover.title}
                        className={cn("size-full", i === 0 && layout?.first)}
                    />
                ))
            )}
        </div>
    );
};

export default CoverGrid;

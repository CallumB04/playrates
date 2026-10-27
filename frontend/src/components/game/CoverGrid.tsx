import type { ListCover } from "@playrates/shared";
import { cn } from "../../lib/cn";
import GameCover from "./GameCover";

interface CoverGridProps {
    /** Up to four, in place; the places past them stay empty wells. */
    covers: ListCover[];
    className?: string;
}

/** A list's picture: four covers, two by two, the shape of one cover. */
const CoverGrid = ({ covers, className }: CoverGridProps) => (
    <div
        aria-hidden
        className={cn(
            "grid aspect-3/4 grid-cols-2 grid-rows-2 gap-px overflow-hidden rounded-sm bg-subtle",
            className
        )}
    >
        {Array.from({ length: 4 }, (_, i) => {
            const cover = covers[i];
            return cover ? (
                <GameCover
                    key={cover.id}
                    coverUrl={cover.coverUrl}
                    title={cover.title}
                    className="size-full"
                />
            ) : (
                <div key={`empty-${i}`} className="bg-surface-sunken" />
            );
        })}
    </div>
);

export default CoverGrid;

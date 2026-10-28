import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import type { Gaming25Category, Gaming25Pick } from "@playrates/shared";
import { gridCells, type Gaming25Cell } from "../../lib/gaming25";
import { cn } from "../../lib/cn";
import GameCover from "../game/GameCover";

interface Gaming25GridProps {
    picks: Gaming25Pick[];
    /** Its owner's grid: every cell a button that picks for it. */
    onPick?: (category: Gaming25Category) => void;
    /** Covers only, for a preview the whole of which is one link. */
    compact?: boolean;
    className?: string;
}

type Cell = Gaming25Cell<Gaming25Pick["game"]>;

const FOCUS =
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

const Cover = ({ cell, onPick }: { cell: Cell; onPick: boolean }) =>
    cell.game ? (
        <GameCover
            coverUrl={cell.game.coverUrl}
            title=""
            className="aspect-3/4 w-full rounded-xs"
        />
    ) : (
        <span
            className={cn(
                "grid aspect-3/4 w-full place-items-center rounded-xs bg-surface-sunken",
                onPick &&
                    "border border-dashed border-strong text-content-muted group-hover/cell:border-brand group-hover/cell:text-brand"
            )}
        >
            {onPick && <Plus size={18} aria-hidden />}
        </span>
    );

/**
 * The 5×5, at every width, so it keeps its shape and the all-time favourite
 * stays in the middle. A phone gets small labels rather than fewer columns.
 */
const Gaming25Grid = ({
    picks,
    onPick,
    compact = false,
    className,
}: Gaming25GridProps) => {
    const cells = gridCells(picks);

    if (compact) {
        return (
            <div
                aria-hidden
                className={cn("grid grid-cols-5 gap-1", className)}
            >
                {cells.map((cell) => (
                    <div
                        key={cell.category}
                        className={cn(
                            "overflow-hidden rounded-xs",
                            cell.centre &&
                                "relative z-10 shadow-glow ring-2 ring-brand"
                        )}
                    >
                        <Cover cell={cell} onPick={false} />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <ol
            aria-label="Gaming 25"
            className={cn("grid grid-cols-5 gap-1 sm:gap-3", className)}
        >
            {cells.map((cell) => {
                const name = cell.game
                    ? `${cell.label}: ${cell.game.title}`
                    : `${cell.label}: ${onPick ? "choose a game" : "not picked"}`;
                const body = (
                    <>
                        <Cover cell={cell} onPick={!!onPick} />
                        <span
                            className={cn(
                                /* The same lines held for every label, so the rows
                                   line up: three on a phone's narrow cells. */
                                "mt-1 line-clamp-3 min-h-[3lh] text-center text-[9.5px] leading-tight font-semibold tracking-tight hyphens-auto sm:mt-1.5 sm:line-clamp-2 sm:min-h-[2lh] sm:text-label-sm sm:tracking-normal",
                                cell.centre ? "text-brand" : "text-content"
                            )}
                        >
                            {cell.label}
                        </span>
                    </>
                );
                const cellClass = cn(
                    "group/cell flex h-full w-full flex-col rounded-sm border px-0.5 pt-0.5 pb-1 text-left sm:rounded-md sm:p-2",
                    cell.centre
                        ? "relative z-10 scale-[1.05] border-brand bg-brand-subtle shadow-glow sm:scale-[1.08]"
                        : "border-subtle bg-surface-raised"
                );

                return (
                    <li
                        key={cell.category}
                        data-centre={cell.centre || undefined}
                    >
                        {onPick ? (
                            <button
                                type="button"
                                onClick={() => onPick(cell.category)}
                                aria-label={name}
                                className={cn(
                                    cellClass,
                                    "cursor-pointer lift hover:border-brand",
                                    FOCUS
                                )}
                            >
                                {body}
                            </button>
                        ) : cell.game ? (
                            <Link
                                to={`/game/${cell.game.id}`}
                                aria-label={name}
                                className={cn(
                                    cellClass,
                                    "lift hover:border-strong",
                                    FOCUS
                                )}
                            >
                                {body}
                            </Link>
                        ) : (
                            <div aria-label={name} className={cellClass}>
                                {body}
                            </div>
                        )}
                    </li>
                );
            })}
        </ol>
    );
};

export default Gaming25Grid;

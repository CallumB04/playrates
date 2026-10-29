import { Link } from "react-router-dom";
import { Crown, Plus } from "lucide-react";
import type { Gaming25Category, Gaming25Pick } from "@playrates/shared";
import { gridCells, type Gaming25Cell } from "../../lib/gaming25";
import { cn } from "../../lib/cn";
import GameCover from "../game/GameCover";

interface Gaming25GridProps {
    picks: Gaming25Pick[];
    /** Its owner's grid: every cell a button that picks for it. */
    onPick?: (category: Gaming25Category) => void;
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
        /* Dashed and hollow rather than a filled block, so an empty cell
           can't be taken for a cover still loading. */
        <span
            className={cn(
                "grid aspect-3/4 w-full place-items-center rounded-xs border border-dashed",
                onPick
                    ? "border-strong text-content-muted group-hover/cell:border-brand group-hover/cell:text-brand"
                    : "border-strong text-content-muted"
            )}
        >
            {onPick ? (
                <span className="grid size-6 place-items-center rounded-full bg-surface-sunken sm:size-8">
                    <Plus size={16} aria-hidden />
                </span>
            ) : (
                <span className="px-1 text-center text-[10px] leading-tight sm:text-label-sm">
                    No pick
                </span>
            )}
        </span>
    );

/**
 * The 5×5, at every width, so it keeps its shape and the favourite game
 * stays in the middle. A phone gets small labels rather than fewer columns.
 */
const Gaming25Grid = ({ picks, onPick, className }: Gaming25GridProps) => {
    const cells = gridCells(picks);

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
                        {cell.centre && (
                            <span
                                aria-hidden
                                className="absolute -top-2.5 left-1/2 z-10 grid size-5 -translate-x-1/2 place-items-center rounded-full bg-medal-gold text-surface-raised shadow-plate sm:-top-3 sm:size-6"
                            >
                                <Crown size={12} strokeWidth={2.5} />
                            </span>
                        )}
                        <Cover cell={cell} onPick={!!onPick} />
                        {/* Fills the cell under the cover and centres the
                            label in it, so the space above and below it
                            matches whatever the row's height. */}
                        <span
                            className={cn(
                                "flex flex-1 items-center justify-center pt-1 pb-0.5 sm:px-1 sm:pt-1.5",
                                cell.centre
                                    ? "font-bold text-medal-gold"
                                    : "font-semibold text-content"
                            )}
                        >
                            <span className="line-clamp-3 text-center text-[10px] leading-tight tracking-tight hyphens-auto sm:line-clamp-2 sm:text-label-sm sm:tracking-normal">
                                {cell.label}
                            </span>
                        </span>
                    </>
                );
                const cellClass = cn(
                    "group/cell relative flex h-full w-full flex-col rounded-sm border px-0.5 pt-0.5 pb-1 text-left sm:rounded-md sm:p-1.5",
                    cell.centre
                        ? "border-medal-gold bg-medal-gold/10 ring-1 ring-medal-gold"
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
                                    "cursor-pointer lift",
                                    !cell.centre && "hover:border-brand",
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
                                    "lift",
                                    !cell.centre && "hover:border-strong",
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

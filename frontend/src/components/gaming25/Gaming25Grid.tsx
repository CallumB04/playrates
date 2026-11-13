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
                    ? "border-strong text-content-muted group-hover/cell:border-brand group-hover/cell:text-brand-text"
                    : "border-strong text-content-muted"
            )}
        >
            {onPick ? (
                <span className="grid size-8 place-items-center rounded-full bg-surface-sunken">
                    <Plus size={16} aria-hidden />
                </span>
            ) : (
                <span className="px-1 text-center text-[11px] leading-tight sm:text-label-sm">
                    No pick
                </span>
            )}
        </span>
    );

/**
 * The 5×5 from a tablet's width, so it keeps its shape and the favourite
 * game stays in the middle. A phone has no room for five across: there the
 * favourite leads, the width of the grid, and the other 24 follow three to
 * a row. The same list, so its order and its links don't change.
 */
const Gaming25Grid = ({ picks, onPick, className }: Gaming25GridProps) => {
    const cells = gridCells(picks);

    return (
        <ol
            aria-label="Gaming 25"
            className={cn(
                "grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3",
                className
            )}
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
                                className="absolute -top-3 left-1/2 z-10 grid size-6 -translate-x-1/2 place-items-center rounded-full bg-medal-gold text-surface-raised shadow-solid max-sm:hidden"
                            >
                                <Crown size={12} strokeWidth={2.5} />
                            </span>
                        )}
                        <span
                            className={cn(
                                "block w-full",
                                cell.centre && "max-sm:w-20 max-sm:shrink-0"
                            )}
                        >
                            <Cover cell={cell} onPick={!!onPick} />
                        </span>
                        {/* Fills the cell under the cover and centres the
                            label in it, so the space above and below it
                            matches whatever the row's height. Beside the
                            cover for the favourite on a phone, with its
                            game's name, as the row has the room. */}
                        <span
                            className={cn(
                                "flex flex-1 items-center justify-center pt-1.5 pb-0.5 sm:px-1",
                                cell.centre
                                    ? "font-bold text-medal-gold max-sm:min-w-0 max-sm:flex-col max-sm:items-start max-sm:pt-0"
                                    : "font-semibold text-content"
                            )}
                        >
                            <span
                                className={cn(
                                    "line-clamp-2 text-center text-[11px] leading-tight hyphens-auto sm:text-label-sm",
                                    cell.centre &&
                                        "max-sm:flex max-sm:items-center max-sm:gap-1.5 max-sm:text-label-sm"
                                )}
                            >
                                {cell.centre && (
                                    <Crown
                                        size={14}
                                        strokeWidth={2.5}
                                        aria-hidden
                                        className="shrink-0 sm:hidden"
                                    />
                                )}
                                {cell.label}
                            </span>
                            {cell.centre && (
                                <span className="mt-1 line-clamp-2 font-display text-lg leading-tight font-semibold text-content sm:hidden">
                                    {cell.game?.title ??
                                        (onPick ? "Choose a game" : "No pick")}
                                </span>
                            )}
                        </span>
                    </>
                );
                const cellClass = cn(
                    "group/cell relative flex h-full w-full flex-col rounded-md border p-1 pb-1.5 text-left sm:p-1.5",
                    cell.centre
                        ? "border-medal-gold bg-medal-gold/10 ring-1 ring-medal-gold max-sm:flex-row max-sm:items-center max-sm:gap-3 max-sm:p-2"
                        : "border-subtle bg-surface-raised"
                );

                return (
                    <li
                        key={cell.category}
                        data-centre={cell.centre || undefined}
                        className={
                            cell.centre
                                ? "max-sm:order-first max-sm:col-span-3"
                                : undefined
                        }
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

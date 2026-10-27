import {
    forwardRef,
    type CSSProperties,
    type HTMLAttributes,
    type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import { EllipsisVertical, GripVertical } from "lucide-react";
import GameCover from "../game/GameCover";
import type { TileAction } from "../game/GameTile";
import Button from "../ui/Button";
import { releaseYear } from "../../lib/format";
import { cn } from "../../lib/cn";
import { rankTone } from "../../pages/ProfilePage/lib/about";

export type RankedRowHandle = HTMLAttributes<HTMLButtonElement> & {
    ref?: (node: HTMLElement | null) => void;
};

export interface RankedGameRowProps extends HTMLAttributes<HTMLLIElement> {
    gameId: number;
    title: string;
    coverUrl: string | null;
    releaseDate?: string | null;
    /** Its place as shown, which moves with a drag before it lands. */
    rank: number;
    /** Under the title, after the year: the platforms it's wished for, say. */
    detail?: ReactNode;
    actions: TileAction[];
    /** Opens the sheet with the moves and, on a phone, the log actions. */
    onMore?: () => void;
    moreOnPhoneOnly?: boolean;
    /** The drag handle's props; no handle without them. */
    handle?: RankedRowHandle;
    /** The copy that follows the pointer while the real row holds its gap. */
    lifted?: boolean;
    /** The real row while its copy is lifted. */
    ghost?: boolean;
    style?: CSSProperties;
}

/** One game at its place in someone's order: a wishlist, a ranked list. */
const RankedGameRow = forwardRef<HTMLLIElement, RankedGameRowProps>(
    (
        {
            gameId,
            title,
            coverUrl,
            releaseDate,
            rank,
            detail,
            actions,
            onMore,
            moreOnPhoneOnly = false,
            handle,
            lifted = false,
            ghost = false,
            className,
            ...props
        },
        ref
    ) => {
        const year = releaseYear(releaseDate);

        return (
            <li
                ref={ref}
                className={cn(
                    "flex items-center gap-2 rounded-sm px-1.5 py-2 sm:gap-3 sm:px-2",
                    lifted
                        ? "bg-surface-raised shadow-modal ring-1 ring-strong"
                        : "bg-surface-raised",
                    // The slot it will land in, while its copy is carried.
                    ghost &&
                        "bg-surface-sunken/60 outline-1 -outline-offset-1 outline-strong outline-dashed [&>*]:invisible",
                    className
                )}
                {...props}
            >
                {handle && (
                    <button
                        type="button"
                        {...handle}
                        aria-label={`Move ${title}, #${rank}`}
                        className={cn(
                            "relative flex h-8 w-6 shrink-0 touch-none items-center justify-center rounded-xs text-content-muted",
                            "before:absolute before:-inset-x-2.5 before:-inset-y-1.5 before:content-['']",
                            "hover:bg-surface-hover hover:text-content focus-visible:outline-2 focus-visible:outline-brand",
                            lifted ? "cursor-grabbing" : "cursor-grab"
                        )}
                    >
                        <GripVertical size={16} aria-hidden />
                    </button>
                )}

                <span
                    aria-hidden
                    className={cn(
                        "w-8 shrink-0 text-right font-mono text-body-sm font-semibold tabular-nums sm:w-9 sm:text-body",
                        rankTone(rank)
                    )}
                >
                    #{rank}
                </span>

                <Link
                    to={`/game/${gameId}`}
                    tabIndex={-1}
                    aria-hidden
                    className="shrink-0"
                >
                    <GameCover
                        coverUrl={coverUrl}
                        title={title}
                        className="aspect-3/4 w-10 rounded-xs sm:w-12"
                    />
                </Link>

                <div className="min-w-0 flex-1">
                    <Link
                        to={`/game/${gameId}`}
                        className="line-clamp-2 text-body-sm font-medium text-content hover:text-brand sm:line-clamp-1 sm:text-body"
                    >
                        <span className="sr-only">#{rank} </span>
                        {title}
                    </Link>
                    {(year || detail) && (
                        <div className="mt-1 flex min-w-0 items-center gap-2">
                            {year && (
                                <span className="shrink-0 font-mono text-label text-content-muted tabular-nums">
                                    {year}
                                </span>
                            )}
                            {detail}
                        </div>
                    )}
                </div>

                {/* On a phone these live in the sheet behind ⋯ instead. */}
                <div className="flex shrink-0 items-center gap-1.5 max-sm:hidden">
                    {actions
                        .filter((a) => !a.icon)
                        .map((action) => (
                            <Button
                                key={action.key}
                                size="sm"
                                variant={
                                    action.tone === "primary"
                                        ? "secondary"
                                        : "ghost"
                                }
                                onClick={() => void action.onSelect()}
                            >
                                {action.label}
                            </Button>
                        ))}
                </div>

                {onMore && (
                    <button
                        type="button"
                        onClick={onMore}
                        aria-label={`More for ${title}`}
                        aria-haspopup="dialog"
                        className={cn(
                            "flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-sm text-content-muted hover:bg-surface-hover hover:text-content focus-visible:outline-2 focus-visible:outline-brand sm:size-9",
                            moreOnPhoneOnly && "sm:hidden"
                        )}
                    >
                        <EllipsisVertical size={16} aria-hidden />
                    </button>
                )}
            </li>
        );
    }
);
RankedGameRow.displayName = "RankedGameRow";

export default RankedGameRow;

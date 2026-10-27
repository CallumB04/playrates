import { forwardRef, type CSSProperties, type HTMLAttributes } from "react";
import { Link } from "react-router-dom";
import { EllipsisVertical, GripVertical } from "lucide-react";
import type { PlatformSystem, WishlistEntry } from "@playrates/shared";
import GameCover from "../../../components/game/GameCover";
import type { TileAction } from "../../../components/game/GameTile";
import Button from "../../../components/ui/Button";
import { releaseYear } from "../../../lib/format";
import { systemIcon } from "../../../lib/platformIcons";
import { cn } from "../../../lib/cn";
import { rankTone } from "../lib/about";

/** The console chips: the machine's mark and its name. */
export const ConsoleChips = ({
    consoles,
    systems,
}: {
    consoles: (string | null)[];
    systems: Map<string, PlatformSystem>;
}) => {
    const named = consoles.filter((slug): slug is string => !!slug);
    // A wish with no console set is for the game wherever it comes out.
    const any = named.length < consoles.length;

    return (
        <ul className="flex min-w-0 flex-wrap gap-1">
            {named.map((slug) => {
                const system = systems.get(slug);
                const Icon = systemIcon(slug, system?.platformSlug ?? "");
                return (
                    <li
                        key={slug}
                        className="inline-flex items-center gap-1 rounded-xs bg-surface-sunken px-1.5 py-0.5 text-label-sm whitespace-nowrap text-content-secondary"
                    >
                        <Icon size={11} aria-hidden />
                        {system?.displayName ?? slug}
                    </li>
                );
            })}
            {any && (
                <li className="inline-flex items-center rounded-xs border border-dashed border-subtle px-1.5 py-0.5 text-label-sm whitespace-nowrap text-content-muted">
                    Any platform
                </li>
            )}
        </ul>
    );
};

export interface WishlistRowProps extends HTMLAttributes<HTMLLIElement> {
    entry: WishlistEntry;
    /** Its place as shown, which moves with a drag before it lands. */
    rank: number;
    systems: Map<string, PlatformSystem>;
    actions: TileAction[];
    /** Opens the sheet with the moves and, on a phone, the log actions. */
    onMore?: () => void;
    moreOnPhoneOnly?: boolean;
    /** The drag handle's props; no handle without them. */
    handle?: HTMLAttributes<HTMLButtonElement> & {
        ref?: (node: HTMLElement | null) => void;
    };
    /** The copy that follows the pointer while the real row holds its gap. */
    lifted?: boolean;
    /** The real row while its copy is lifted. */
    ghost?: boolean;
    style?: CSSProperties;
}

/** One game on a wishlist, at its place in its owner's order. */
const WishlistRow = forwardRef<HTMLLIElement, WishlistRowProps>(
    (
        {
            entry,
            rank,
            systems,
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
        const title = entry.game?.title ?? "Unknown game";
        const year = releaseYear(entry.game?.releaseDate);

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
                    to={`/game/${entry.gameId}`}
                    tabIndex={-1}
                    aria-hidden
                    className="shrink-0"
                >
                    <GameCover
                        coverUrl={entry.game?.coverUrl ?? null}
                        title={title}
                        className="aspect-3/4 w-10 rounded-xs sm:w-12"
                    />
                </Link>

                <div className="min-w-0 flex-1">
                    <Link
                        to={`/game/${entry.gameId}`}
                        className="line-clamp-2 text-body-sm font-medium text-content hover:text-brand sm:line-clamp-1 sm:text-body"
                    >
                        <span className="sr-only">#{rank} </span>
                        {title}
                    </Link>
                    <div className="mt-1 flex min-w-0 items-center gap-2">
                        {year && (
                            <span className="shrink-0 font-mono text-label text-content-muted tabular-nums">
                                {year}
                            </span>
                        )}
                        <ConsoleChips
                            consoles={entry.consoles}
                            systems={systems}
                        />
                    </div>
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
WishlistRow.displayName = "WishlistRow";

export default WishlistRow;

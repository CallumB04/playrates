import { Link } from "react-router-dom";
import { ArrowBigUp, Lock, Users } from "lucide-react";
import type { GameListSummary } from "@playrates/shared";
import CoverGrid from "../game/CoverGrid";
import { accentHue, avatarGradient } from "../../lib/profileAccent";
import { formatCount } from "../../lib/format";
import { listPath } from "../../lib/profilePaths";
import { cn } from "../../lib/cn";

interface ListCardProps {
    list: GameListSummary;
    /** Whose it is, where the page doesn't already say. */
    showOwner?: boolean;
    /** For a narrow column: a smaller picture and no description. */
    compact?: boolean;
}

/** One list: its picture, its name, a line of what it is, and its counts. */
const ListCard = ({
    list,
    showOwner = false,
    compact = false,
}: ListCardProps) => {
    const Hidden =
        list.visibility === "private"
            ? Lock
            : list.visibility === "friends"
              ? Users
              : null;

    return (
        <Link
            to={listPath(list.owner.username, list.id)}
            className={cn(
                "group relative flex gap-3 overflow-hidden rounded-lg border border-subtle bg-surface-raised p-2.5 lift hover:-translate-y-px hover:border-strong",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                list.colour && "pl-3.5"
            )}
        >
            {list.colour && (
                // Its colour, down the edge it's filed by.
                <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 w-1"
                    style={{
                        backgroundImage: avatarGradient(accentHue(list.colour)),
                    }}
                />
            )}
            <CoverGrid
                covers={list.covers}
                className={cn("shrink-0", compact ? "w-14" : "w-20 sm:w-24")}
            />
            <div className="flex min-w-0 flex-1 flex-col py-0.5">
                <p className="line-clamp-2 text-body-sm font-medium text-content group-hover:text-brand">
                    {list.name}
                </p>
                {showOwner && (
                    <p className="mt-0.5 truncate text-label-sm text-content-muted">
                        by {list.owner.username}
                    </p>
                )}
                {!compact && list.description && (
                    <p className="mt-1 line-clamp-2 text-label text-content-secondary">
                        {list.description}
                    </p>
                )}
                <p className="mt-auto flex items-center gap-3 pt-2 text-label-sm text-content-muted tabular-nums">
                    <span>
                        {formatCount(list.gameCount)}{" "}
                        {list.gameCount === 1 ? "game" : "games"}
                    </span>
                    <span className="inline-flex items-center gap-0.5">
                        <ArrowBigUp size={13} aria-hidden />
                        {formatCount(list.voteCount)}
                        <span className="sr-only">
                            {list.voteCount === 1 ? " upvote" : " upvotes"}
                        </span>
                    </span>
                    {Hidden && (
                        <span className="inline-flex items-center gap-1">
                            <Hidden size={12} aria-hidden />
                            {list.visibility === "private"
                                ? "Only you"
                                : "Friends"}
                        </span>
                    )}
                </p>
            </div>
        </Link>
    );
};

export default ListCard;

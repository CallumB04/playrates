import { Link } from "react-router-dom";
import { X } from "lucide-react";
import GameCover from "../game/GameCover";

interface GameFilterPillProps {
    gameId: number;
    title: string | undefined;
    coverUrl: string | null | undefined;
    onClear: () => void;
}

/**
 * Says the list is narrowed to one game, and undoes it. The clear is a
 * labelled button of its own rather than an x inside the chip, so it reads
 * as the way out and not as part of the name.
 */
const GameFilterPill = ({
    gameId,
    title,
    coverUrl,
    onClear,
}: GameFilterPillProps) => (
    <span className="inline-flex max-w-full min-w-0 items-center gap-2 rounded-full border border-brand/40 bg-brand-subtle py-1 pr-1 pl-1">
        <GameCover
            coverUrl={coverUrl ?? null}
            title={title ?? ""}
            className="size-7 shrink-0 overflow-hidden rounded-full"
        />
        <Link
            to={`/game/${gameId}`}
            className="min-w-0 truncate text-body-sm font-semibold text-brand hover:underline"
        >
            {title ?? "One game"}
        </Link>
        <button
            type="button"
            onClick={onClear}
            aria-label={`Clear the ${title ?? "game"} filter and show every thread`}
            className="relative inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-full border border-subtle bg-surface-raised px-2.5 text-label-sm font-medium text-content-secondary lift before:absolute before:-inset-2 before:content-[''] hover:border-strong hover:text-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
            <X size={13} aria-hidden />
            Clear
        </button>
    </span>
);

export default GameFilterPill;

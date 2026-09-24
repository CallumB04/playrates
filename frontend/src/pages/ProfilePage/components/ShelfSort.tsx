import { ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";
import type { GameLogSort, SortDirection } from "@playrates/shared";
import Dropdown from "../../../components/ui/Dropdown";
import { directionLabel, shelfSortOptions } from "../lib/shelfSort";

interface ShelfSortProps {
    sort: GameLogSort;
    direction: SortDirection;
    /** Only to word the rating option, which is not "yours" on someone
     *  else's profile. */
    isMyAccount: boolean;
    onChange: (next: { sort?: GameLogSort; direction?: SortDirection }) => void;
}

/**
 * What the shelf is ordered by, and which way round. The direction is a
 * toggle rather than twelve menu entries — every sort has both, and the pair
 * reads as one control.
 */
const ShelfSort = ({
    sort,
    direction,
    isMyAccount,
    onChange,
}: ShelfSortProps) => {
    const flipped = direction === "asc";
    const Arrow = flipped ? ArrowUpNarrowWide : ArrowDownWideNarrow;

    return (
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
            <Dropdown
                options={shelfSortOptions(isMyAccount).map((option) => ({
                    value: option.value,
                    label: option.label,
                }))}
                value={sort}
                onChange={(value) => onChange({ sort: value as GameLogSort })}
                aria-label="Sort by"
                className="min-w-0 flex-1 sm:w-44 sm:flex-none"
            />
            <button
                type="button"
                onClick={() =>
                    onChange({ direction: flipped ? "desc" : "asc" })
                }
                /* The wording changes with the sort — "A to Z" and "Highest
                   first" are the same direction but not the same sentence. */
                aria-label={`Sort order: ${directionLabel(sort, direction)}`}
                title={directionLabel(sort, direction)}
                className="flex size-11 shrink-0 items-center justify-center rounded-sm border border-subtle bg-surface-raised text-content-secondary lift hover:border-strong hover:text-content sm:size-9"
            >
                <Arrow size={16} aria-hidden />
            </button>
        </div>
    );
};

export default ShelfSort;

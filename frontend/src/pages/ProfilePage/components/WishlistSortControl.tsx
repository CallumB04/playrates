import Dropdown from "../../../components/ui/Dropdown";
import {
    WISHLIST_SORTS,
    WISHLIST_SORT_LABELS,
    type WishlistSort,
} from "../lib/wishlist";

interface WishlistSortControlProps {
    sort: WishlistSort;
    isMyAccount: boolean;
    onChange: (sort: WishlistSort) => void;
}

/** The wishlist's own sorts: its owner's order first. No direction toggle —
 *  an order read backwards isn't anyone's. */
const WishlistSortControl = ({
    sort,
    isMyAccount,
    onChange,
}: WishlistSortControlProps) => (
    <Dropdown
        options={WISHLIST_SORTS.map((value) => ({
            value,
            label:
                value === "rank" && !isMyAccount
                    ? "Their order"
                    : WISHLIST_SORT_LABELS[value],
        }))}
        value={sort}
        onChange={(value) => onChange(value as WishlistSort)}
        aria-label="Sort by"
        className="min-w-0 flex-1 sm:w-44 sm:flex-none"
    />
);

export default WishlistSortControl;

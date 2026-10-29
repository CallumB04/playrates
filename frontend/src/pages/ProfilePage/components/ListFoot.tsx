import type { PaginationState } from "../../../hooks/usePagination";
import Pagination from "../../../components/ui/Pagination";
import { formatCount } from "../../../lib/format";

/** "Entries 1–10 of 42" and the page buttons, under a paged list. */
const ListFoot = ({ pagination }: { pagination: PaginationState }) => {
    const { page, perPage, total } = pagination;
    if (total === 0) return null;

    return (
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-label text-content-muted">
                Entries {formatCount((page - 1) * perPage + 1)}–
                {formatCount(Math.min(page * perPage, total))} of{" "}
                {formatCount(total)}
            </p>
            <Pagination pagination={pagination} />
        </div>
    );
};

export default ListFoot;

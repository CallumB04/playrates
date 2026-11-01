import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import type { ListSort } from "@playrates/shared";
import Button from "../../../components/ui/Button";
import SegmentedChoice from "../../../components/ui/SegmentedChoice";
import { Skeleton } from "../../../components/ui/Skeleton";
import ListCard from "../../../components/lists/ListCard";
import ListEditor from "../../../components/lists/ListEditor";
import { useUserLists } from "../../../hooks/queries/useLists";
import { usePagination } from "../../../hooks/usePagination";
import { listPath } from "../../../lib/profilePaths";
import ListFoot from "../components/ListFoot";
import EmptyPlate from "../../../components/ui/EmptyPlate";
import { usePageParam } from "../lib/usePageParam";

export const LISTS_PER_PAGE = 12;
export const DEFAULT_LIST_SORT: ListSort = "new";

interface ListsViewProps {
    username: string;
    isOwner: boolean;
    canSee: boolean;
}

/** Someone's lists, the newest made or the most loved first. */
const ListsView = ({ username, isOwner, canSee }: ListsViewProps) => {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const [page, setPage] = usePageParam();
    const [creating, setCreating] = useState(false);
    const sort: ListSort = params.get("sort") === "popular" ? "popular" : "new";

    const { data, isLoading } = useUserLists(username, {
        sort,
        page,
        limit: LISTS_PER_PAGE,
        enabled: canSee,
    });
    const lists = data?.data ?? [];
    const pagination = usePagination({
        total: data?.meta.total ?? 0,
        perPage: LISTS_PER_PAGE,
        page,
        onPageChange: setPage,
    });

    const setSort = (next: ListSort) => {
        const updated = new URLSearchParams(params);
        if (next === DEFAULT_LIST_SORT) updated.delete("sort");
        else updated.set("sort", next);
        updated.delete("page");
        setParams(updated);
    };

    const loading = isLoading || !canSee;
    // Nothing to sort with no lists, and the empty card offers New list
    // itself: the row above it sat it lower than every other empty view.
    const empty = !loading && lists.length === 0;
    const newList = (
        <Button onClick={() => setCreating(true)} className="w-full sm:w-auto">
            <Plus size={15} aria-hidden />
            New list
        </Button>
    );

    return (
        <section className="flex flex-col gap-3">
            {!empty && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                    {lists.length > 0 && (
                        <SegmentedChoice
                            label="Sort lists"
                            segments={[
                                { value: "new", label: "New" },
                                { value: "popular", label: "Popular" },
                            ]}
                            value={sort}
                            onChange={setSort}
                        />
                    )}
                    {isOwner && newList}
                </div>
            )}

            {loading ? (
                <div className="grid gap-3 sm:grid-cols-2">
                    {Array.from({ length: 4 }, (_, i) => (
                        <Skeleton key={i} className="h-36 rounded-lg" />
                    ))}
                </div>
            ) : empty ? (
                <EmptyPlate
                    title="No lists yet"
                    body={
                        isOwner
                            ? "Make your first list, a top ten or whatever you like."
                            : undefined
                    }
                    action={isOwner ? newList : undefined}
                />
            ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                    {lists.map((list) => (
                        <li key={list.id}>
                            <ListCard list={list} showVisibility={isOwner} />
                        </li>
                    ))}
                </ul>
            )}

            <ListFoot pagination={pagination} />

            {creating && (
                <ListEditor
                    onClose={() => setCreating(false)}
                    onSaved={(list) =>
                        navigate(listPath(list.owner.username, list.id))
                    }
                />
            )}
        </section>
    );
};

export default ListsView;

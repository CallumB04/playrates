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
import ListEmpty from "../components/ListEmpty";
import { usePageParam } from "../lib/usePageParam";

export const LISTS_PER_PAGE = 12;
export const DEFAULT_LIST_SORT: ListSort = "new";

interface ListsViewProps {
    username: string;
    isOwner: boolean;
    canSee: boolean;
}

/** Someone's lists, the newest made or the most reacted to first. */
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

    return (
        <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                {/* Nothing to sort with no lists. */}
                {(isLoading || lists.length > 0) && (
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
                {isOwner && (
                    <Button
                        onClick={() => setCreating(true)}
                        className="w-full sm:w-auto"
                    >
                        <Plus size={15} aria-hidden />
                        New list
                    </Button>
                )}
            </div>

            {isLoading || !canSee ? (
                <div className="grid gap-3 sm:grid-cols-2">
                    {Array.from({ length: 4 }, (_, i) => (
                        <Skeleton key={i} className="h-36 rounded-lg" />
                    ))}
                </div>
            ) : lists.length === 0 ? (
                <ListEmpty
                    title="No lists yet"
                    body={
                        isOwner
                            ? "Gather games into lists: a top ten, a to-play pile, anything."
                            : undefined
                    }
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

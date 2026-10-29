import { useQueries } from "@tanstack/react-query";
import { Pin } from "lucide-react";
import Panel from "../../../components/ui/Panel";
import ListCard from "../../../components/lists/ListCard";
import { fetchList } from "../../../api/endpoints/lists";
import { queryKeys } from "../../../api/queryKeys";

/** The lists a member pinned to the top of their profile. One deleted or
 *  hidden since goes quietly, and with none left to show to this viewer,
 *  so does the card. */
const PinnedLists = ({ ids }: { ids: number[] }) => {
    const lists = useQueries({
        queries: ids.map((id) => ({
            queryKey: queryKeys.lists.detail(id),
            queryFn: () => fetchList(id),
            retry: false,
        })),
    });
    const shown = lists.flatMap((q) => (q.data ? [q.data] : []));
    if (shown.length === 0) return null;
    return (
        <Panel
            title={
                <span className="inline-flex items-center gap-2">
                    <Pin size={15} aria-hidden className="text-brand" />
                    Pinned lists
                </span>
            }
        >
            <div className="grid gap-3 sm:grid-cols-2">
                {shown.map((list) => (
                    <ListCard key={list.id} list={list} />
                ))}
            </div>
        </Panel>
    );
};

export default PinnedLists;

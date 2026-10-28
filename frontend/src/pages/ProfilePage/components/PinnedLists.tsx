import { Pin } from "lucide-react";
import Panel from "../../../components/ui/Panel";
import ListCard from "../../../components/lists/ListCard";
import { useList } from "../../../hooks/queries/useLists";

/** One pinned list, gone quietly if it's been deleted or hidden since. */
const Pinned = ({ id }: { id: number }) => {
    const { data } = useList(id);
    return data ? <ListCard list={data} /> : null;
};

/** The lists a member pinned to the top of their profile. */
const PinnedLists = ({ ids }: { ids: number[] }) => {
    if (ids.length === 0) return null;
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
                {ids.map((id) => (
                    <Pinned key={id} id={id} />
                ))}
            </div>
        </Panel>
    );
};

export default PinnedLists;

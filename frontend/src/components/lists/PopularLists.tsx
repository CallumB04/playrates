import Panel from "../ui/Panel";
import ListCard from "./ListCard";
import { usePopularLists } from "../../hooks/queries/useLists";

const SHOWN = 4;

/** The most upvoted public lists, small enough for a side column. */
const PopularLists = () => {
    const { data } = usePopularLists(SHOWN);
    const lists = data?.data ?? [];
    if (lists.length === 0) return null;

    return (
        <Panel title="Popular lists" bodyClassName="flex flex-col gap-2 p-3">
            {lists.map((list) => (
                <ListCard key={list.id} list={list} showOwner compact />
            ))}
        </Panel>
    );
};

export default PopularLists;

import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { Pin } from "lucide-react";
import type { GameListSummary } from "@playrates/shared";
import Panel from "../../../components/ui/Panel";
import Button from "../../../components/ui/Button";
import ListCard from "../../../components/lists/ListCard";
import { fetchList } from "../../../api/endpoints/lists";
import { queryKeys } from "../../../api/queryKeys";
import { useUserLists } from "../../../hooks/queries/useLists";
import { useEditParam } from "../lib/useEditParam";
import { usePins } from "../lib/usePinReviews";
import ChoosePins from "./ChoosePins";

interface PinnedListsProps {
    username: string;
    ids: number[];
    isOwner: boolean;
}

/** The lists a member pinned to the top of their profile. One deleted or
 *  hidden since goes quietly, and with none left to show to this viewer,
 *  so does the card. Its owner sees it empty too, with a way to choose. */
const PinnedLists = ({ username, ids, isOwner }: PinnedListsProps) => {
    const lists = useQueries({
        queries: ids.map((id) => ({
            queryKey: queryKeys.lists.detail(id),
            queryFn: () => fetchList(id),
            retry: false,
        })),
    });
    const shown = lists.flatMap((q) => (q.data ? [q.data] : []));
    if (isOwner) return <OwnPinnedLists username={username} shown={shown} />;
    if (shown.length === 0) return null;
    return (
        <Panel title={<Title />}>
            <Lists lists={shown} />
        </Panel>
    );
};

const Title = () => (
    <span className="inline-flex items-center gap-2">
        <Pin size={15} aria-hidden className="text-brand" />
        Pinned lists
    </span>
);

const Lists = ({ lists }: { lists: GameListSummary[] }) => (
    <div className="grid gap-3 sm:grid-cols-2">
        {lists.map((list) => (
            <ListCard key={list.id} list={list} />
        ))}
    </div>
);

/** Only what everyone can see: a hidden list pinned is an empty card to
 *  anyone else. */
const usePinnableLists = (username: string) => {
    const query = useUserLists(username, { sort: "new", page: 1, limit: 50 });
    return {
        ...query,
        lists: (query.data?.data ?? []).filter(
            (l) => l.visibility === "everyone"
        ),
    };
};

const OwnPinnedLists = ({
    username,
    shown,
}: {
    username: string;
    shown: GameListSummary[];
}) => {
    const { slots } = usePins("pinnedLists");
    const { lists } = usePinnableLists(username);
    const [asked, doneAsking] = useEditParam("pinned_lists");
    const [choosing, setChoosing] = useState(false);
    // Everyone has a slot from the start, so an empty card waits for a list
    // that could go in it.
    if (slots === 0 || (shown.length === 0 && lists.length === 0)) return null;
    return (
        <Panel
            title={<Title />}
            trailing={
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setChoosing(true)}
                    className="-my-1 max-sm:min-h-11"
                >
                    Choose
                </Button>
            }
        >
            {shown.length > 0 ? (
                <Lists lists={shown} />
            ) : (
                <p className="py-1 text-body-sm text-content-muted">
                    Pin up to {slots} of your lists here, for everyone to see
                    first.
                </p>
            )}
            {(choosing || asked) && (
                <ChooseLists
                    username={username}
                    onClose={() => {
                        setChoosing(false);
                        doneAsking();
                    }}
                />
            )}
        </Panel>
    );
};

const ChooseLists = ({
    username,
    onClose,
}: {
    username: string;
    onClose: () => void;
}) => {
    const { slots, pinned, save, saving } = usePins("pinnedLists");
    const { lists, isLoading } = usePinnableLists(username);
    return (
        <ChoosePins
            title="Pinned lists"
            slots={slots}
            pinned={pinned}
            choices={lists.map((list) => ({
                id: list.id,
                title: list.name,
                detail: `${list.gameCount} ${list.gameCount === 1 ? "game" : "games"}`,
            }))}
            loading={isLoading}
            saving={saving}
            onSave={(picked) => save(picked, onClose)}
            onClose={onClose}
        />
    );
};

export default PinnedLists;

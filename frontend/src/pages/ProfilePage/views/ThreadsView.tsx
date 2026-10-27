import { useThreads } from "../../../hooks/queries/useCommunity";
import { usePagination } from "../../../hooks/usePagination";
import Panel, { PanelCount } from "../../../components/ui/Panel";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import ThreadCard from "../../../components/community/ThreadCard";
import { formatCount } from "../../../lib/format";
import ListFoot from "../components/ListFoot";
import { NoThreads } from "../components/ListEmpty";
import { usePageParam } from "../lib/usePageParam";

const THREADS_PER_PAGE = 10;

interface ThreadsViewProps {
    username: string;
    isOwner: boolean;
    canSee: boolean;
}

/** Every thread they started or replied to, most recently active first. */
const ThreadsView = ({ username, isOwner, canSee }: ThreadsViewProps) => {
    const [page, setPage] = usePageParam();
    const { data, isLoading } = useThreads(
        {
            participant: username,
            sort: "active",
            page,
            limit: THREADS_PER_PAGE,
        },
        canSee
    );
    const threads = data?.data ?? [];
    const total = data?.meta.total ?? 0;

    const pagination = usePagination({
        total,
        perPage: THREADS_PER_PAGE,
        page,
        onPageChange: setPage,
    });

    return (
        <section>
            <Panel
                title="Community threads"
                trailing={data && <PanelCount value={formatCount(total)} />}
                bodyClassName="flex flex-col p-1"
            >
                {isLoading || !canSee ? (
                    <div className="px-3 py-3">
                        <TextSkeleton lines={8} />
                    </div>
                ) : threads.length === 0 ? (
                    <NoThreads username={username} isOwner={isOwner} />
                ) : (
                    threads.map((thread) => (
                        <ThreadCard key={thread.id} thread={thread} />
                    ))
                )}
            </Panel>
            <ListFoot pagination={pagination} />
        </section>
    );
};

export default ThreadsView;

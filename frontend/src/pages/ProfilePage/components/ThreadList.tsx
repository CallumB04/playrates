import { useThreads } from "../../../hooks/queries/useCommunity";
import { usePagination } from "../../../hooks/usePagination";
import { cardClass } from "../../../components/ui/Card";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import ThreadCard from "../../../components/community/ThreadCard";
import ListFoot from "./ListFoot";
import { NoThreads } from "./ListEmpty";
import { usePageParam } from "../lib/usePageParam";

export const THREADS_PER_PAGE = 10;

interface ThreadListProps {
    username: string;
    isOwner: boolean;
    canSee: boolean;
}

/** Every thread they started or replied to, most recently active first. */
const ThreadList = ({ username, isOwner, canSee }: ThreadListProps) => {
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

    const pagination = usePagination({
        total: data?.meta.total ?? 0,
        perPage: THREADS_PER_PAGE,
        page,
        onPageChange: setPage,
    });

    if (!isLoading && canSee && threads.length === 0)
        return <NoThreads isOwner={isOwner} />;

    return (
        <>
            <div
                className={cardClass("flex flex-col p-1", { padding: "none" })}
            >
                {isLoading || !canSee ? (
                    <div className="px-3 py-3">
                        <TextSkeleton lines={8} />
                    </div>
                ) : (
                    threads.map((thread) => (
                        <ThreadCard key={thread.id} thread={thread} />
                    ))
                )}
            </div>
            <ListFoot pagination={pagination} />
        </>
    );
};

export default ThreadList;

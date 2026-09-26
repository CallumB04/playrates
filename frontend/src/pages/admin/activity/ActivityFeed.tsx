import type { AdminActivityFilters } from "../../../api";
import EmptyPlate from "../../../components/ui/EmptyPlate";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import { useAdminActivity } from "../../../hooks/queries/useAdmin";
import LoadMore from "../components/LoadMore";
import ActivityRow from "./ActivityRow";

/** The activity log for whatever the filters say: everyone, one group, one
 *  person. Also what a user's detail shows. */
const ActivityFeed = ({
    filters,
    onFilterUser,
}: {
    filters: AdminActivityFilters;
    onFilterUser?: (userId: string) => void;
}) => {
    const feed = useAdminActivity(filters);
    const events = feed.data?.pages.flatMap((page) => page.data) ?? [];

    if (feed.isPending) return <TextSkeleton lines={8} />;
    if (feed.isError) {
        return (
            <EmptyPlate
                title="The activity log didn't load"
                body="Check the Health view for the API and database."
            />
        );
    }
    if (events.length === 0) {
        return <EmptyPlate title="Nothing here yet" body="No activity matches." />;
    }

    return (
        <div className={feed.isPlaceholderData ? "opacity-60 transition-opacity" : undefined}>
            <ul className="flex flex-col gap-1.5">
                {events.map((event) => (
                    <ActivityRow key={event.id} event={event} onFilterUser={onFilterUser} />
                ))}
            </ul>
            <LoadMore
                hasMore={feed.hasNextPage}
                loading={feed.isFetchingNextPage}
                onClick={() => feed.fetchNextPage()}
                endLabel="That's the beginning of the log."
            />
        </div>
    );
};

export default ActivityFeed;

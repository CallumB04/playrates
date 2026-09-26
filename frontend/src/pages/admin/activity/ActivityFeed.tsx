import type { AdminActivityFilters } from "../../../api";
import { cardClass } from "../../../components/ui/Card";
import EmptyPlate, { EmptyNote } from "../../../components/ui/EmptyPlate";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import { cn } from "../../../lib/cn";
import { useAdminActivity } from "../../../hooks/queries/useAdmin";
import ShowOlder from "../components/ShowOlder";
import { groupByDay } from "../lib/plot";
import ActivityRow from "./ActivityRow";

/** The activity log for whatever the filters say, one day at a time: every
 *  person, one kind, or a single account's history. */
const ActivityFeed = ({
    filters,
    onFilterUser,
    compact = false,
    limit,
}: {
    filters: AdminActivityFilters;
    onFilterUser?: (userId: string) => void;
    /** Inside another surface, such as a person's detail: no card of its own. */
    compact?: boolean;
    /** Show only the first few, with no way to page on. */
    limit?: number;
}) => {
    const feed = useAdminActivity(filters);
    const all = feed.data?.pages.flatMap((page) => page.data) ?? [];
    const events = limit ? all.slice(0, limit) : all;

    if (feed.isPending) return <TextSkeleton lines={8} />;
    if (feed.isError) {
        return (
            <EmptyPlate
                title="The activity log didn’t load"
                body="Either the API or the database isn’t answering. Health will say which."
            />
        );
    }
    if (events.length === 0) {
        return compact ? (
            <EmptyNote>Nothing yet.</EmptyNote>
        ) : (
            <EmptyPlate title="Nothing to show" body="Nobody has done that yet. Pick another kind, or clear the filter." />
        );
    }

    return (
        <div className={cn("transition-opacity", feed.isPlaceholderData && "opacity-60")}>
            <div className={compact ? undefined : cardClass("px-1.5 pt-1 pb-2 sm:px-2", { padding: "none" })}>
                {groupByDay(events, (e) => e.createdAt).map((day) => (
                    <section key={day.key}>
                        <h3 className="flex items-baseline justify-between px-2 pt-3.5 pb-1 text-label text-content-muted">
                            {day.label}
                            <span className="font-mono text-label-sm">{day.items.length}</span>
                        </h3>
                        <ul className="flex flex-col">
                            {day.items.map((event) => (
                                <ActivityRow key={event.id} event={event} day={day.label} onFilterUser={onFilterUser} />
                            ))}
                        </ul>
                    </section>
                ))}
            </div>
            {!limit && <ShowOlder
                hasMore={feed.hasNextPage}
                loading={feed.isFetchingNextPage}
                onClick={() => feed.fetchNextPage()}
                end="That’s where the log begins."
            />}
        </div>
    );
};

export default ActivityFeed;

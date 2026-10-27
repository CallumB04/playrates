import { Link } from "react-router-dom";
import type { ThreadCard as ThreadCardData } from "@playrates/shared";
import Panel, { panelButtonClass } from "../../../components/ui/Panel";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import ThreadCard from "../../../components/community/ThreadCard";
import { postsPath } from "../../../lib/profilePaths";
import { formatCount } from "../../../lib/format";
import { NoThreads } from "./ListEmpty";

export const COMMUNITY_THREADS_SHOWN = 3;

interface CommunityThreadsProps {
    username: string;
    threads: ThreadCardData[];
    /** Every thread they are in, for the "See all" count. */
    total: number;
    isLoading: boolean;
    isOwner: boolean;
}

/** The last few threads this person started or replied to; the rest are
 *  on their posts view. */
const CommunityThreads = ({
    username,
    threads,
    total,
    isLoading,
    isOwner,
}: CommunityThreadsProps) => {
    const shown = threads.slice(0, COMMUNITY_THREADS_SHOWN);

    return (
        <Panel title="Community threads" bodyClassName="flex flex-col p-1">
            {isLoading ? (
                <div className="px-3 py-3">
                    <TextSkeleton lines={4} />
                </div>
            ) : shown.length === 0 ? (
                <NoThreads username={username} isOwner={isOwner} />
            ) : (
                <>
                    {shown.map((thread) => (
                        <ThreadCard key={thread.id} thread={thread} />
                    ))}
                    {total > shown.length && (
                        <div className="flex p-2 pt-1">
                            <Link
                                to={postsPath(username, "threads")}
                                className={panelButtonClass()}
                            >
                                See all {formatCount(total)}
                            </Link>
                        </div>
                    )}
                </>
            )}
        </Panel>
    );
};

export default CommunityThreads;

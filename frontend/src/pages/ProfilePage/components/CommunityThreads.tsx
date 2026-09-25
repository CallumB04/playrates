import { Link } from "react-router-dom";
import type { ThreadCard as ThreadCardData } from "@playrates/shared";
import Panel, { panelButtonClass } from "../../../components/ui/Panel";
import { buttonClass } from "../../../components/ui/Button";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import ThreadCard from "../../../components/community/ThreadCard";
import { participantThreadsPath } from "../../../components/community/paths";
import { formatCount } from "../../../lib/format";

export const COMMUNITY_THREADS_SHOWN = 3;

interface CommunityThreadsProps {
    username: string;
    threads: ThreadCardData[];
    /** Every thread they are in, for the "See all" count. */
    total: number;
    isLoading: boolean;
    isOwner: boolean;
}

/** The last few threads this person started or replied to. */
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
                <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
                    <p className="text-body-sm text-content-muted">
                        {isOwner
                            ? "Threads you start or reply to will show here."
                            : `${username} hasn't posted in any threads yet.`}
                    </p>
                    {isOwner && (
                        <Link
                            to="/community"
                            className={buttonClass(
                                "secondary",
                                "min-h-11 sm:min-h-9",
                                "sm"
                            )}
                        >
                            Browse the community
                        </Link>
                    )}
                </div>
            ) : (
                <>
                    {shown.map((thread) => (
                        <ThreadCard key={thread.id} thread={thread} />
                    ))}
                    {total > shown.length && (
                        <div className="flex p-2 pt-1">
                            <Link
                                to={participantThreadsPath(username)}
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

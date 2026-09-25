import { Link } from "react-router-dom";
import type { ThreadCard as ThreadCardData } from "@playrates/shared";
import Panel from "../../../components/ui/Panel";
import { buttonClass } from "../../../components/ui/Button";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import ThreadCard from "../../../components/community/ThreadCard";

interface CommunityThreadsProps {
    threads: ThreadCardData[];
    isLoading: boolean;
    isOwner: boolean;
}

/** The threads this person has posted in lately, most recent post first. */
const CommunityThreads = ({
    threads,
    isLoading,
    isOwner,
}: CommunityThreadsProps) => (
    <Panel title="Community" bodyClassName="flex flex-col p-1">
        {isLoading ? (
            <div className="px-3 py-3">
                <TextSkeleton lines={4} />
            </div>
        ) : threads.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
                <p className="text-body-sm text-content-muted">
                    {isOwner
                        ? "You haven't joined any threads yet."
                        : "Hasn't posted in any threads yet."}
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
            threads.map((thread) => (
                <ThreadCard key={thread.id} thread={thread} />
            ))
        )}
    </Panel>
);

export default CommunityThreads;

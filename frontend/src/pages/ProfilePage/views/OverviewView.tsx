import { Link } from "react-router-dom";
import type { FriendEdge, ReviewWithAuthor } from "@playrates/shared";
import { useUserShelf } from "../../../hooks/queries/useGameLogs";
import { usePlatforms } from "../../../hooks/queries/useGames";
import { useUserThreads } from "../../../hooks/queries/useCommunity";
import Panel, { panelButtonClass } from "../../../components/ui/Panel";
import { TileSkeleton } from "../../../components/ui/Skeleton";
import { shelfPath } from "../../../lib/profilePaths";
import { formatCount } from "../../../lib/format";
import ShelfTile from "../components/ShelfTile";
import ListEmpty from "../components/ListEmpty";
import RecentReviews from "../components/RecentReviews";
import CommunityThreads, {
    COMMUNITY_THREADS_SHOWN,
} from "../components/CommunityThreads";
import FriendsPanel from "../components/FriendsPanel";
import { useShelfTileActions } from "../lib/useShelfTileActions";

const PLAYING_SHOWN = 4;

interface OverviewViewProps {
    username: string;
    isOwner: boolean;
    canSee: boolean;
    /** The first page of their reviews, which the header counts too. */
    reviews: ReviewWithAuthor[];
    reviewTotal: number;
    reviewsLoading: boolean;
    threadTotal: number;
    friends: FriendEdge[];
    friendsLoading: boolean;
    sharedFriendCount?: number;
    pendingCount: number;
}

const PlayingNow = ({
    username,
    isOwner,
    canSee,
}: Pick<OverviewViewProps, "username" | "isOwner" | "canSee">) => {
    const { data, isLoading } = useUserShelf(
        username,
        "playing",
        { page: 1, limit: PLAYING_SHOWN, sort: "played", direction: "desc" },
        canSee
    );
    const { data: platforms } = usePlatforms();
    const { buildTileActions } = useShelfTileActions(username, isOwner);
    const entries = data?.data ?? [];
    const total = data?.meta.total ?? 0;

    return (
        <Panel title="Playing now" bodyClassName="p-4">
            {isLoading || !canSee ? (
                <div className="grid grid-cols-2 gap-x-3.5 gap-y-4 sm:grid-cols-4">
                    {Array.from({ length: PLAYING_SHOWN }, (_, i) => (
                        <TileSkeleton key={i} />
                    ))}
                </div>
            ) : entries.length === 0 ? (
                <ListEmpty
                    message={
                        isOwner
                            ? "Nothing on the go."
                            : `${username} isn't playing anything right now.`
                    }
                    action={
                        isOwner
                            ? { to: "/library", label: "Find a game to play" }
                            : undefined
                    }
                />
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-x-3.5 gap-y-4 sm:grid-cols-4">
                        {entries.map((entry) => (
                            <ShelfTile
                                key={entry.gameId}
                                entry={entry}
                                shelf="playing"
                                sort="played"
                                platforms={platforms ?? []}
                                actions={buildTileActions(entry)}
                            />
                        ))}
                    </div>
                    {total > entries.length && (
                        <div className="mt-4 flex">
                            <Link
                                to={shelfPath(username, "playing")}
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

/** The profile at a glance: what they're playing, what they've said, and
 *  who they know. Each part leads to its own view. */
const OverviewView = ({
    username,
    isOwner,
    canSee,
    reviews,
    reviewTotal,
    reviewsLoading,
    threadTotal,
    friends,
    friendsLoading,
    sharedFriendCount,
    pendingCount,
}: OverviewViewProps) => {
    const { data: threads, isLoading: threadsLoading } = useUserThreads(
        username,
        COMMUNITY_THREADS_SHOWN,
        canSee
    );

    return (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="flex min-w-0 flex-col gap-6">
                <PlayingNow
                    username={username}
                    isOwner={isOwner}
                    canSee={canSee}
                />
                <RecentReviews
                    username={username}
                    reviews={reviews}
                    total={reviewTotal}
                    isLoading={reviewsLoading || !canSee}
                    isOwner={isOwner}
                />
                <CommunityThreads
                    username={username}
                    threads={threads ?? []}
                    total={threadTotal}
                    isLoading={threadsLoading || !canSee}
                    isOwner={isOwner}
                />
            </div>
            <FriendsPanel
                username={username}
                friends={friends}
                isLoading={friendsLoading || !canSee}
                sharedCount={sharedFriendCount}
                pendingCount={pendingCount}
            />
        </div>
    );
};

export default OverviewView;

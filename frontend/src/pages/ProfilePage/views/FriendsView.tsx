import type { FriendEdge } from "@playrates/shared";
import Panel, { PanelCount } from "../../../components/ui/Panel";
import FriendProfile from "../../../components/FriendProfile";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import { formatCount } from "../../../lib/format";
import ListEmpty from "../components/ListEmpty";
import FriendRequests from "../components/FriendRequests";

interface FriendsViewProps {
    /** Every edge: friends, and on your own profile your requests too. */
    edges: FriendEdge[];
    isLoading: boolean;
    isOwner: boolean;
    /** How many of them you also know. Omitted on your own profile. */
    sharedCount?: number;
}

/** The whole friend list, and on your own profile the requests waiting. */
const FriendsView = ({
    edges,
    isLoading,
    isOwner,
    sharedCount,
}: FriendsViewProps) => {
    const friends = edges.filter((e) => e.status === "friend");

    return (
        <div className="flex flex-col gap-6">
            {isOwner && !isLoading && <FriendRequests edges={edges} />}

            <Panel
                title="Friends"
                trailing={
                    !isLoading && (
                        <PanelCount value={formatCount(friends.length)} />
                    )
                }
                bodyClassName="p-2"
            >
                {isLoading ? (
                    <div className="px-2 py-3">
                        <TextSkeleton lines={6} />
                    </div>
                ) : friends.length === 0 ? (
                    <ListEmpty
                        title="No friends yet"
                        action={
                            isOwner
                                ? {
                                      to: "/community",
                                      label: "Find people in Community",
                                  }
                                : undefined
                        }
                    />
                ) : (
                    <>
                        {sharedCount !== undefined && sharedCount > 0 && (
                            <p className="px-2 pb-1 text-label-sm text-content-muted">
                                {formatCount(sharedCount)} you both know
                            </p>
                        )}
                        <div className="grid gap-0.5 sm:grid-cols-2 sm:gap-x-2 lg:grid-cols-3">
                            {friends.map((edge) => (
                                <FriendProfile
                                    key={edge.user.id}
                                    user={edge.user}
                                    density="comfortable"
                                    trailing={
                                        edge.user.online ? "Online" : "Offline"
                                    }
                                />
                            ))}
                        </div>
                    </>
                )}
            </Panel>
        </div>
    );
};

export default FriendsView;

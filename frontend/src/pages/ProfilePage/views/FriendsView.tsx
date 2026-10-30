import type { FriendEdge } from "@playrates/shared";
import Panel, { PanelCount } from "../../../components/ui/Panel";
import FriendProfile from "../../../components/FriendProfile";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import { formatCount } from "../../../lib/format";
import { Link } from "react-router-dom";
import { buttonClass } from "../../../components/ui/Button";
import EmptyPlate from "../../../components/ui/EmptyPlate";
import { InviteButton } from "../../../components/progress/Invite";
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
                        <span className="flex items-center gap-4">
                            {isOwner && friends.length > 0 && <InviteButton />}
                            <PanelCount value={formatCount(friends.length)} />
                        </span>
                    )
                }
                bodyClassName="p-2"
            >
                {isLoading ? (
                    <div className="px-2 py-3">
                        <TextSkeleton lines={6} />
                    </div>
                ) : friends.length === 0 ? (
                    isOwner ? (
                        // The people you'd want here may not be on PlayRates
                        // yet: asking them comes first.
                        <EmptyPlate
                            title="No friends yet"
                            body="Invite people you know, or find some in the community."
                            action={
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <InviteButton
                                        variant="button"
                                        className="w-full sm:w-auto"
                                    />
                                    <Link
                                        to="/community"
                                        className={buttonClass(
                                            "secondary",
                                            "w-full sm:w-auto"
                                        )}
                                    >
                                        Find people in Community
                                    </Link>
                                </div>
                            }
                        />
                    ) : (
                        <ListEmpty title="No friends yet" />
                    )
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

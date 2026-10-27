import { Link } from "react-router-dom";
import type { FriendEdge } from "@playrates/shared";
import FriendProfile from "../../../components/FriendProfile";
import Panel, {
    PanelCount,
    panelButtonClass,
} from "../../../components/ui/Panel";
import { buttonClass } from "../../../components/ui/Button";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import { formatCount } from "../../../lib/format";
import { profilePath } from "../../../lib/profilePaths";

interface FriendsPanelProps {
    friends: FriendEdge[];
    /** How many of them you also know. Omitted on your own profile. */
    sharedCount?: number;
    /** Requests waiting on the owner. Only ever passed on your own profile. */
    pendingCount?: number;
    isLoading: boolean;
    username: string;
}

const SHOWN = 6;

/** The friends summary. The full list and any requests are on the friends
 *  view. */
const FriendsPanel = ({
    friends,
    sharedCount,
    pendingCount = 0,
    isLoading,
    username,
}: FriendsPanelProps) => (
    <Panel
        title="Friends"
        trailing={
            isLoading ? undefined : (
                <PanelCount value={formatCount(friends.length)} />
            )
        }
        bodyClassName="flex flex-col gap-0.5 p-2"
    >
        {isLoading ? (
            <div className="px-2 py-3">
                <TextSkeleton lines={4} />
            </div>
        ) : friends.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
                <p className="text-body-sm text-content-muted">
                    No friends yet.
                </p>
                <Link
                    to="/community"
                    className={buttonClass("secondary", undefined, "sm")}
                >
                    Find people in Community
                </Link>
            </div>
        ) : (
            <>
                {sharedCount !== undefined && sharedCount > 0 && (
                    <p className="px-2 pb-1 text-label-sm text-content-muted">
                        {formatCount(sharedCount)} you both know
                    </p>
                )}
                {friends.slice(0, SHOWN).map((edge) => (
                    <FriendProfile
                        key={edge.user.id}
                        user={edge.user}
                        density="compact"
                        trailing={edge.user.online ? "Online" : "Offline"}
                    />
                ))}
            </>
        )}

        {!isLoading && (friends.length > 0 || pendingCount > 0) && (
            <div className="mt-1 flex gap-2">
                {friends.length > 0 && (
                    <Link
                        to={profilePath(username, "friends")}
                        className={panelButtonClass()}
                    >
                        See all {formatCount(friends.length)}
                    </Link>
                )}
                {pendingCount > 0 && (
                    <Link
                        to={profilePath(username, "friends")}
                        className={panelButtonClass(true)}
                    >
                        {formatCount(pendingCount)} request
                        {pendingCount === 1 ? "" : "s"}
                    </Link>
                )}
            </div>
        )}
    </Panel>
);

export default FriendsPanel;

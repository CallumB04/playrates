import type { FriendEdge } from "@playrates/shared";
import FriendProfile from "../../../components/FriendProfile";
import Panel, { PanelCount } from "../../../components/ui/Panel";
import { formatCount } from "../../../lib/format";

interface FriendsLedgerProps {
    friends: FriendEdge[];
    /** How many of them you also know. Omitted on your own profile. */
    sharedCount?: number;
}

const FriendsLedger = ({ friends, sharedCount }: FriendsLedgerProps) => (
    <Panel
        title={
            sharedCount !== undefined && sharedCount > 0
                ? `Friends · ${formatCount(sharedCount)} shared`
                : "Friends"
        }
        trailing={<PanelCount value={formatCount(friends.length)} />}
        bodyClassName="flex flex-col gap-0.5 p-2"
    >
        {friends.length === 0 ? (
            <p className="px-2 py-1 text-body-sm text-content-muted">
                No friends yet.
            </p>
        ) : (
            friends
                .slice(0, 8)
                .map((edge) => (
                    <FriendProfile
                        key={edge.user.id}
                        user={edge.user}
                        density="compact"
                        trailing={edge.user.online ? "Online" : "Offline"}
                    />
                ))
        )}
    </Panel>
);

export default FriendsLedger;

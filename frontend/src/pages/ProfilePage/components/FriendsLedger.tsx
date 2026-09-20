import type { FriendEdge } from "@playrates/shared";
import FriendProfile from "../../../components/FriendProfile";
import { formatCount } from "../../../lib/format";

interface FriendsLedgerProps {
    friends: FriendEdge[];
    /** How many of them you also know. Omitted on your own profile. */
    sharedCount?: number;
}

const FriendsLedger = ({ friends, sharedCount }: FriendsLedgerProps) => (
    <section>
        <h2 className="mb-3 font-mono text-label uppercase text-content-muted">
            Friends · {formatCount(friends.length)}
            {sharedCount !== undefined &&
                sharedCount > 0 &&
                ` · ${formatCount(sharedCount)} shared`}
        </h2>

        {friends.length === 0 ? (
            <p className="text-body-sm text-content-muted">No friends yet.</p>
        ) : (
            friends.slice(0, 8).map((edge) => (
                <div key={edge.user.id} className="border-b border-subtle">
                    <FriendProfile
                        user={edge.user}
                        density="compact"
                        trailing={edge.user.online ? "Online" : "Offline"}
                    />
                </div>
            ))
        )}
    </section>
);

export default FriendsLedger;

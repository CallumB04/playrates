import { Link } from "react-router-dom";
import type { FriendEdge } from "@playrates/shared";
import FriendProfile from "../../../components/FriendProfile";
import Panel, { PanelCount } from "../../../components/ui/Panel";
import { buttonClass } from "../../../components/ui/Button";
import { formatCount } from "../../../lib/format";

interface FriendsPanelProps {
    friends: FriendEdge[];
    /** How many of them you also know. Omitted on your own profile. */
    sharedCount?: number;
    /** Requests waiting on the owner. Only ever passed on your own profile. */
    pendingCount?: number;
    onOpenAll: () => void;
}

const SHOWN = 6;

/**
 * The friends summary.
 *
 * Friends had a page of their own, reachable from the navbar, which is a lot
 * of furniture for a list most people check occasionally. It lives on the
 * profile it belongs to, with everything else behind one button.
 */
const FriendsPanel = ({
    friends,
    sharedCount,
    pendingCount = 0,
    onOpenAll,
}: FriendsPanelProps) => (
    <Panel
        title="Friends"
        trailing={
            <span className="flex items-center gap-2">
                {pendingCount > 0 && (
                    <span className="rounded-full bg-brand px-2 py-0.5 font-mono text-label-sm text-content-on-solid">
                        {formatCount(pendingCount)} waiting
                    </span>
                )}
                <PanelCount value={formatCount(friends.length)} />
            </span>
        }
        bodyClassName="flex flex-col gap-0.5 p-2"
    >
        {friends.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
                <p className="text-body-sm text-content-muted">
                    No friends yet.
                </p>
                <Link
                    to="/catalogue"
                    className={buttonClass("secondary", undefined, "sm")}
                >
                    Find people by their games
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

        {(friends.length > SHOWN || pendingCount > 0) && (
            <button
                type="button"
                onClick={onOpenAll}
                className="lift mt-1 w-full cursor-pointer rounded-sm border border-subtle px-3 py-2 text-body-sm text-content-secondary hover:border-strong hover:text-content"
            >
                {pendingCount > 0
                    ? `See all and answer ${formatCount(pendingCount)}`
                    : `See all ${formatCount(friends.length)}`}
            </button>
        )}
    </Panel>
);

export default FriendsPanel;

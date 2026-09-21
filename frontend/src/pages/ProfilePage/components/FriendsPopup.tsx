import { UserPlus } from "lucide-react";
import type { FriendEdge } from "@playrates/shared";
import Modal from "../../../components/ui/Modal";
import Button from "../../../components/ui/Button";
import FriendProfile from "../../../components/FriendProfile";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import { formatCount } from "../../../lib/format";

interface FriendsPopupProps {
    friends: FriendEdge[];
    isLoading: boolean;
    /** Requests waiting on you. Zero hides the button. */
    pendingCount: number;
    onViewRequests: () => void;
    onClose: () => void;
}

/** The full friend list. Requests live in their own popup. */
const FriendsPopup = ({
    friends,
    isLoading,
    pendingCount,
    onViewRequests,
    onClose,
}: FriendsPopupProps) => (
    <Modal
        onClose={onClose}
        labelledBy="friends-popup-title"
        className="w-full max-w-lg"
    >
        <div className="flex items-center justify-between gap-4 pr-10">
            <h2
                id="friends-popup-title"
                className="font-display text-section text-content"
            >
                Friends
                <span className="ml-2 font-mono text-body-sm text-content-muted">
                    {formatCount(friends.length)}
                </span>
            </h2>

            {pendingCount > 0 && (
                <Button size="sm" variant="secondary" onClick={onViewRequests}>
                    <UserPlus size={14} aria-hidden />
                    {formatCount(pendingCount)} request
                    {pendingCount === 1 ? "" : "s"}
                </Button>
            )}
        </div>

        <div className="mt-4 flex max-h-[62vh] flex-col gap-0.5 overflow-y-auto">
            {isLoading ? (
                <TextSkeleton lines={6} />
            ) : friends.length === 0 ? (
                <p className="px-2 py-6 text-center text-body-sm text-content-muted">
                    No friends yet.
                </p>
            ) : (
                friends.map((edge) => (
                    <FriendProfile
                        key={edge.user.id}
                        user={edge.user}
                        density="compact"
                        closePopup={onClose}
                        trailing={edge.user.online ? "Online" : "Offline"}
                    />
                ))
            )}
        </div>
    </Modal>
);

export default FriendsPopup;

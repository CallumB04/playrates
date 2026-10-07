import type { Profile, FriendEdge } from "@playrates/shared";
import RemoveFriendPopup from "./RemoveFriendPopup";
import FriendsPopup from "./FriendsPopup";
import FriendRequestsPopup from "./FriendRequestsPopup";
import EditProfilePopup from "./EditProfilePopup";

/* A union rather than a flag each, so two open at once isn't representable.
   Logs open through the log flow, as they do everywhere else. */
export type ProfileModal =
    | { kind: "removeFriend" }
    | { kind: "friends" }
    | { kind: "friendRequests" }
    | { kind: "editProfile" }
    | null;

interface ProfileModalsProps {
    modal: ProfileModal;
    setModal: (modal: ProfileModal) => void;
    targetUser: Profile;
    isMyAccount: boolean;
    /** Every edge, so the popups can show friends and requests. */
    allFriendEdges: FriendEdge[];
    friendsLoading: boolean;
    onRemoveFriend: () => Promise<void>;
}

/** Renders whichever modal the page currently has open. */
const ProfileModals = ({
    modal,
    setModal,
    targetUser,
    isMyAccount,
    allFriendEdges,
    friendsLoading,
    onRemoveFriend,
}: ProfileModalsProps) => {
    const pendingCount = allFriendEdges.filter(
        (e) => e.status === "request-received"
    ).length;

    if (!modal) return null;

    return (
        <>
            {modal.kind === "removeFriend" && (
                <RemoveFriendPopup
                    closePopup={() => setModal(null)}
                    confirmRemove={onRemoveFriend}
                    friendName={targetUser.username}
                />
            )}

            {modal.kind === "friends" && (
                <FriendsPopup
                    onClose={() => setModal(null)}
                    friends={allFriendEdges.filter(
                        (e) => e.status === "friend"
                    )}
                    isLoading={friendsLoading}
                    pendingCount={isMyAccount ? pendingCount : 0}
                    onViewRequests={() => setModal({ kind: "friendRequests" })}
                />
            )}

            {modal.kind === "friendRequests" && (
                <FriendRequestsPopup
                    onClose={() => setModal(null)}
                    edges={allFriendEdges}
                    isLoading={friendsLoading}
                />
            )}

            {modal.kind === "editProfile" && (
                <EditProfilePopup
                    closePopup={() => setModal(null)}
                    user={targetUser}
                />
            )}
        </>
    );
};

export default ProfileModals;

import type { Profile, FriendEdge } from "@playrates/shared";
import type { GameLogWithGame } from "../../../api";
import RemoveFriendPopup from "./RemoveFriendPopup";
import FriendsPopup from "./FriendsPopup";
import FriendRequestsPopup from "./FriendRequestsPopup";
import EditProfilePopup from "./EditProfilePopup";
import ViewGameLogPopup from "../../../components/ViewGameLogPopup";
import CreateOrEditGameLogPopup from "../../../components/CreateOrEditGameLogPopup";
import DeleteGameLogPopup from "../../../components/gamelog/DeleteGameLogPopup";

/* A union rather than a flag each, so two open at once isn't representable.
   The ones acting on a game log carry it rather than looking it up again. */
export type ProfileModal =
    | { kind: "view"; log: GameLogWithGame }
    | { kind: "edit"; log: GameLogWithGame }
    | { kind: "create"; log: GameLogWithGame }
    | { kind: "delete"; log: GameLogWithGame }
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
    isSignedIn: boolean;
    currentUsername?: string;
    /** Every game the viewer has logged. A page of them makes "View my log"
     *  disappear at random. */
    myLogGameIds: Set<number>;
    /** Every edge, so the popups can show friends and requests. */
    allFriendEdges: FriendEdge[];
    friendsLoading: boolean;
    onRemoveFriend: () => Promise<void>;
    navigate: (to: string) => void;
}

/** Renders whichever modal the page currently has open. */
const ProfileModals = ({
    modal,
    setModal,
    targetUser,
    isMyAccount,
    isSignedIn,
    currentUsername,
    myLogGameIds,
    allFriendEdges,
    friendsLoading,
    onRemoveFriend,
    navigate,
}: ProfileModalsProps) => {
    const pendingCount = allFriendEdges.filter(
        (e) => e.status === "request-received"
    ).length;

    /* Three states: your own log is editable, a game you have also logged
       links to your copy, anything else you can start. */
    const viewAction = (log: GameLogWithGame) => {
        if (!isSignedIn) return undefined;
        if (isMyAccount) {
            return {
                label: "Edit",
                onSelect: () => setModal({ kind: "edit", log }),
            };
        }
        if (myLogGameIds.has(log.gameId)) {
            return {
                label: "View my log",
                onSelect: () =>
                    navigate(`/user/${currentUsername}?log=${log.gameId}`),
            };
        }
        return {
            label: "Add this game",
            onSelect: () => setModal({ kind: "create", log }),
        };
    };

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

            {modal.kind === "view" && (
                <ViewGameLogPopup
                    closePopup={() => setModal(null)}
                    gamelog={modal.log}
                    ownerUsername={targetUser.username}
                    primaryAction={viewAction(modal.log)}
                />
            )}

            {modal.kind === "edit" && (
                <CreateOrEditGameLogPopup
                    closePopup={() => setModal(null)}
                    gamelog={modal.log}
                    editing
                    viewUpdatedLog={() => setModal(null)}
                />
            )}

            {modal.kind === "create" && (
                <CreateOrEditGameLogPopup
                    closePopup={() => setModal(null)}
                    gameID={modal.log.gameId}
                    editing={false}
                    viewUpdatedLog={() => setModal(null)}
                />
            )}

            {modal.kind === "delete" && (
                <DeleteGameLogPopup
                    closePopup={() => setModal(null)}
                    gameLog={modal.log}
                />
            )}
        </>
    );
};

export default ProfileModals;

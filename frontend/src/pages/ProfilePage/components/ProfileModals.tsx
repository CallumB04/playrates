import type { Profile, FriendEdge } from "@playrates/shared";
import type { GameLogWithGame } from "../../../api";
import RemoveFriendPopup from "./RemoveFriendPopup";
import FriendsPopup from "./FriendsPopup";
import EditProfilePopup from "./EditProfilePopup";
import ViewGameLogPopup from "../../../components/ViewGameLogPopup";
import CreateOrEditGameLogPopup from "../../../components/CreateOrEditGameLogPopup";
import DeleteGameLogPopup from "../../../components/gamelog/DeleteGameLogPopup";

/**
 * Which modal the page is showing. A union rather than a flag each, so two
 * open at once isn't representable, and the ones acting on a game log carry it
 * rather than reading it from somewhere else.
 */
export type ProfileModal =
    | { kind: "view"; log: GameLogWithGame }
    | { kind: "edit"; log: GameLogWithGame }
    | { kind: "create"; log: GameLogWithGame }
    | { kind: "delete"; log: GameLogWithGame }
    | { kind: "removeFriend" }
    | { kind: "friends" }
    | { kind: "editProfile" }
    | null;

interface ProfileModalsProps {
    modal: ProfileModal;
    setModal: (modal: ProfileModal) => void;
    targetUser: Profile;
    isMyAccount: boolean;
    isSignedIn: boolean;
    currentUsername?: string;
    /** Every game the viewer has logged. A complete set, not a page of
     *  one — a partial answer makes "View my log" disappear at random. */
    myLogGameIds: Set<number>;
    acceptedFriends: FriendEdge[];
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
    acceptedFriends,
    friendsLoading,
    onRemoveFriend,
    navigate,
}: ProfileModalsProps) => {
    /* Three states, computed once: your own log is editable, a game you have
       also logged links to your copy, anything else you can start. */
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
                    closePopup={() => setModal(null)}
                    friends={acceptedFriends}
                    friendsLoading={friendsLoading}
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

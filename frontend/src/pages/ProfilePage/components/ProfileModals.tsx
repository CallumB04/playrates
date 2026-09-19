import type { Profile, FriendEdge } from "@playrates/shared";
import type { GameLogWithGame } from "../../../api";
import RemoveFriendPopup from "./RemoveFriendPopup";
import MobileSearchPopup from "./MobileSearchPopup";
import MobileGameSectionPopup from "./MobileGameSectionPopup";
import FriendsPopup from "./FriendsPopup";
import EditProfilePopup from "./EditProfilePopup";
import ViewGameLogPopup from "../../../components/ViewGameLogPopup";
import CreateOrEditGameLogPopup from "../../../components/CreateOrEditGameLogPopup";
import DeleteGameLogPopup from "../../../components/gamelog/DeleteGameLogPopup";

/**
 * Which modal, if any, the profile page is showing. A discriminated union
 * rather than a boolean per popup: the old page carried ten separate
 * visibility flags plus a "currently visible log", which allowed states like
 * two popups open at once, and forced non-null assertions at every use.
 */
export type ProfileModal =
    | { kind: "view"; log: GameLogWithGame }
    | { kind: "edit"; log: GameLogWithGame }
    | { kind: "create"; log: GameLogWithGame }
    | { kind: "delete"; log: GameLogWithGame }
    | { kind: "removeFriend" }
    | { kind: "friends" }
    | { kind: "editProfile" }
    | { kind: "mobileSearch" }
    | { kind: "mobileSection" }
    | null;

interface ProfileModalsProps {
    modal: ProfileModal;
    setModal: (modal: ProfileModal) => void;
    targetUser: Profile;
    isMyAccount: boolean;
    isSignedIn: boolean;
    currentUsername?: string;
    currentUserGameLogs: GameLogWithGame[];
    acceptedFriends: FriendEdge[];
    friendsLoading: boolean;
    activeGamesSection: string;
    onSelectSection: (section: string) => void;
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
    currentUserGameLogs,
    acceptedFriends,
    friendsLoading,
    activeGamesSection,
    onSelectSection,
    onRemoveFriend,
    navigate,
}: ProfileModalsProps) => {
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

            {modal.kind === "mobileSearch" && (
                <MobileSearchPopup
                    closePopup={() => setModal(null)}
                    onSearch={() => {}}
                />
            )}

            {modal.kind === "mobileSection" && (
                <MobileGameSectionPopup
                    closePopup={() => setModal(null)}
                    currentActiveSection={activeGamesSection}
                    selectSection={(section) => {
                        onSelectSection(section);
                        navigate(
                            `/user/${targetUser.username}?type=${section}`
                        );
                    }}
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
                    isMyAccount={isMyAccount}
                    userLoggedIn={isSignedIn}
                    currentUserSharesLog={currentUserGameLogs.some(
                        (l) => l.gameId === modal.log.gameId
                    )}
                    openEdit={() => setModal({ kind: "edit", log: modal.log })}
                    openCreate={() =>
                        setModal({ kind: "create", log: modal.log })
                    }
                    redirectAndOpenView={() =>
                        navigate(
                            `/user/${currentUsername}?log=${modal.log.gameId}`
                        )
                    }
                    profilePage
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

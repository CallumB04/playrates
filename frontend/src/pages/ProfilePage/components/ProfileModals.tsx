import type { Profile } from "@playrates/shared";
import RemoveFriendPopup from "./RemoveFriendPopup";
import EditProfilePopup from "./EditProfilePopup";
import BackgroundPicker from "./BackgroundPicker";

/* A union rather than a flag each, so two open at once isn't representable.
   Logs open through the log flow, as they do everywhere else. */
export type ProfileModal =
    | { kind: "removeFriend" }
    | { kind: "editProfile" }
    | { kind: "background" }
    | null;

interface ProfileModalsProps {
    modal: ProfileModal;
    setModal: (modal: ProfileModal) => void;
    targetUser: Profile;
    onRemoveFriend: () => Promise<void>;
}

/** Renders whichever modal the page currently has open. */
const ProfileModals = ({
    modal,
    setModal,
    targetUser,
    onRemoveFriend,
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

            {modal.kind === "background" && (
                <BackgroundPicker
                    profile={targetUser}
                    onClose={() => setModal(null)}
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

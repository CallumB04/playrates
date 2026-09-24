import { useState } from "react";
import { Link } from "react-router-dom";
import type { Profile } from "@playrates/shared";
import {
    useRemoveAvatar,
    useUpdateAvatar,
    useUpdateProfile,
} from "../../../hooks/queries/useProfiles";
import { useNotify } from "../../../contexts/NotificationContext";
import Modal from "../../../components/ui/Modal";
import Button from "../../../components/ui/Button";
import Field from "../../../components/ui/Field";
import { Input, Textarea } from "../../../components/ui/Input";
import AvatarField, { type AvatarChoice } from "./AvatarField";

interface EditProfilePopupProps {
    closePopup: () => void;
    user: Profile;
}

const BIO_LIMIT = 160;

/**
 * The profile editor. The username only changes capitalisation here — a real
 * rename has to check availability, so it lives in Settings.
 */
const EditProfilePopup: React.FC<EditProfilePopupProps> = ({
    closePopup,
    user,
}) => {
    const notify = useNotify();
    const updateProfile = useUpdateProfile();
    const updateAvatar = useUpdateAvatar();
    const removeAvatar = useRemoveAvatar();

    const [bio, setBio] = useState(user.bio);
    const [username, setUsername] = useState(user.username);
    const [avatar, setAvatar] = useState<AvatarChoice>({ kind: "unchanged" });

    const sameLetters = username.toLowerCase() === user.username.toLowerCase();
    const fieldsDirty = bio !== user.bio || username !== user.username;
    const dirty = fieldsDirty || avatar.kind !== "unchanged";
    const saving =
        updateProfile.isPending ||
        updateAvatar.isPending ||
        removeAvatar.isPending;

    const save = async () => {
        if (!sameLetters) return;
        try {
            /* The picture first: it is the change most likely to fail, and
               failing it after the text had already been written would leave
               the two out of step with what the form still shows. */
            if (avatar.kind === "picked") {
                await updateAvatar.mutateAsync(avatar.image);
            } else if (avatar.kind === "removed") {
                await removeAvatar.mutateAsync();
            }
            // the mutation seeds the profile caches, so the page updates straight away
            if (fieldsDirty) await updateProfile.mutateAsync({ username, bio });
            notify("Profile updated", "success");
            closePopup();
        } catch {
            notify("Couldn't update your profile", "error");
        }
    };

    return (
        <Modal
            onClose={closePopup}
            labelledBy="edit-profile-title"
            className="w-full max-w-[520px]"
        >
            <h2
                id="edit-profile-title"
                className="border-b border-subtle pb-3 font-display text-section text-content"
            >
                Edit profile
            </h2>

            <div className="flex flex-col gap-5 pt-5">
                <AvatarField
                    username={user.username}
                    current={user.avatarUrl}
                    choice={avatar}
                    onChange={setAvatar}
                    disabled={saving}
                />

                <Field
                    label="Bio"
                    help={`${bio.length} of ${BIO_LIMIT} characters`}
                >
                    {(a11y) => (
                        <Textarea
                            rows={3}
                            value={bio}
                            maxLength={BIO_LIMIT}
                            placeholder="I love PlayRates."
                            onChange={(e) => setBio(e.target.value)}
                            {...a11y}
                        />
                    )}
                </Field>

                <Field
                    label="Username capitalisation"
                    help={
                        <>
                            Rename in{" "}
                            <Link
                                to="/settings"
                                className="text-content underline hover:text-brand"
                            >
                                Settings
                            </Link>
                            .
                        </>
                    }
                    error={
                        sameLetters
                            ? undefined
                            : `Keep the same letters as ${user.username}.`
                    }
                >
                    {(a11y) => (
                        <Input
                            value={username}
                            maxLength={user.username.length}
                            onChange={(e) => setUsername(e.target.value)}
                            {...a11y}
                        />
                    )}
                </Field>

                <div className="flex flex-wrap gap-3">
                    <Button
                        className="flex-1"
                        onClick={() => void save()}
                        disabled={!dirty || !sameLetters || saving}
                    >
                        {saving ? "Saving…" : "Save changes"}
                    </Button>
                    <Button
                        variant="secondary"
                        className="flex-1"
                        onClick={closePopup}
                    >
                        Cancel
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default EditProfilePopup;

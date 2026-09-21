import { useState } from "react";
import { Link } from "react-router-dom";
import type { Profile } from "@playrates/shared";
import { useUpdateProfile } from "../../../hooks/queries/useProfiles";
import { useNotify } from "../../../contexts/NotificationContext";
import Modal from "../../../components/ui/Modal";
import Button from "../../../components/ui/Button";
import Field from "../../../components/ui/Field";
import { Input, Textarea } from "../../../components/ui/Input";
import ProfilePicture from "../../../components/ProfilePicture";

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

    const [bio, setBio] = useState(user.bio);
    const [username, setUsername] = useState(user.username);

    const sameLetters = username.toLowerCase() === user.username.toLowerCase();
    const dirty = bio !== user.bio || username !== user.username;

    const save = async () => {
        if (!sameLetters) return;
        try {
            // the mutation seeds the profile caches, so the page updates straight away
            await updateProfile.mutateAsync({ username, bio });
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
                {/* No upload control: there is no endpoint behind one, and
                    the generated avatar is the current design rather than a
                    placeholder waiting to be replaced. */}
                <div className="flex items-center gap-4">
                    <ProfilePicture
                        variant="review"
                        username={user.username}
                        file={user.avatarUrl ?? ""}
                        link={false}
                    />
                    <div>
                        <p className="text-body-sm text-content">
                            Your picture
                        </p>
                        <p className="mt-0.5 text-label-sm text-content-muted">
                            Made from your initial, so it changes when your
                            username does.
                        </p>
                    </div>
                </div>

                <Field
                    label="Bio"
                    help={`${bio.length} of ${BIO_LIMIT} characters`}
                >
                    {(a11y) => (
                        <Textarea
                            rows={3}
                            value={bio}
                            maxLength={BIO_LIMIT}
                            placeholder="Mostly RPGs and anything with a grappling hook."
                            onChange={(e) => setBio(e.target.value)}
                            {...a11y}
                        />
                    )}
                </Field>

                <Field
                    label="Username capitalisation"
                    help={
                        <>
                            Only the capitalisation changes here. Rename in{" "}
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
                        disabled={
                            !dirty || !sameLetters || updateProfile.isPending
                        }
                    >
                        {updateProfile.isPending ? "Saving…" : "Save changes"}
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

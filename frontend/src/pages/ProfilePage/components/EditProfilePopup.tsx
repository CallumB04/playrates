import { useRef, useState } from "react";
import type { Profile } from "@playrates/shared";
import { useUpdateProfile } from "../../../hooks/queries/useProfiles";
import { useNotify } from "../../../contexts/NotificationContext";
import Modal from "../../../components/ui/Modal";
import ProfilePicture from "../../../components/ProfilePicture";
import { Link } from "react-router-dom";
import LoadingSpinner from "../../../components/LoadingSpinner";

interface EditProfilePopupProps {
    closePopup: () => void;
    user: Profile;
}

const EditProfilePopup: React.FC<EditProfilePopupProps> = ({
    closePopup,
    user,
}) => {
    const notify = useNotify();
    const updateProfile = useUpdateProfile();
    const bio = user.bio;
    const username = user.username;

    const [loadingUpdate, setLoadingUpdate] = useState<boolean>(false);
    const [bioInputValue, setBioInputValue] = useState<string>(user.bio);
    const [usernameInputValue, setUsernameInputValue] = useState<string>(
        user.username
    );
    const [usernameInputMatches, setUsernameInputMatches] =
        useState<boolean>(true);

    const fileInput = useRef<HTMLInputElement>(null);

    const handleSave = async () => {
        setLoadingUpdate(true);

        if (usernameInputValue.toLowerCase() !== user.username.toLowerCase()) {
            setUsernameInputMatches(false);
            setLoadingUpdate(false);
            return;
        }

        try {
            // the mutation seeds the profile caches, so the page updates
            // without the temporary local copies the old code kept
            await updateProfile.mutateAsync({
                username: usernameInputValue,
                bio: bioInputValue,
            });
            setUsernameInputMatches(true);
            notify("Successfully updated profile", "success");
            closePopup();
        } catch {
            notify("Error updating profile, please try again", "error");
        } finally {
            setLoadingUpdate(false);
        }
    };

    return (
        <Modal
            onClose={closePopup}
            className="flex w-[550px] flex-col gap-6 text-center"
        >
            <div className="contents">
                <div className="flex w-full flex-col gap-3">
                    <h2 className="text-xl text-content">Edit Profile</h2>
                    <p className="border-t border-t-subtle pt-3 font-light text-content-secondary">
                        Update your public profile and how others see you!
                    </p>
                </div>
                <div className="flex flex-col items-center gap-8">
                    {/* Profile picture with hidden uploader */}
                    <div>
                        <div
                            className="group relative hover:cursor-pointer"
                            onClick={() => fileInput.current?.click()}
                        >
                            <ProfilePicture
                                variant="editProfile"
                                username={user.username}
                                file={user.pictureUrl ?? ""}
                                link={false}
                            />
                            <div className="absolute left-0 top-0 flex h-full w-full items-center justify-center rounded-full bg-overlay-avatar font-semibold text-content opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                                Click to Upload
                            </div>
                        </div>
                        <input
                            type="file"
                            accept="image/png, image/jpeg"
                            ref={fileInput}
                            className="hidden"
                        />
                    </div>
                    <div className="flex w-full flex-col gap-1">
                        <span className="flex w-full items-end justify-between">
                            <p className="text-left font-semibold text-content-secondary">
                                Bio
                            </p>
                            <p className="text-sm font-light text-content-secondary">
                                Max 160 Characters
                            </p>
                        </span>
                        <textarea
                            defaultValue={bio}
                            className="multiline-input h-20 w-full"
                            maxLength={160}
                            onChange={(e) =>
                                setBioInputValue(e.currentTarget.value)
                            }
                        ></textarea>
                    </div>
                    <div className="flex w-full flex-col gap-1">
                        <span className="flex w-full items-end justify-between gap-2">
                            <p className="text-left font-semibold text-content-secondary">
                                Username Capitalization
                            </p>
                            <p className="text-right text-sm font-light text-content-secondary">
                                Change in{" "}
                                <Link
                                    to="/settings"
                                    className="hover-text-white underline"
                                >
                                    Settings
                                </Link>
                            </p>
                        </span>
                        <input
                            defaultValue={username}
                            className="text-input h-12 w-full"
                            maxLength={username.length}
                            onChange={(e) =>
                                setUsernameInputValue(e.currentTarget.value)
                            }
                        />
                        {!usernameInputMatches ? (
                            <p className="text-left font-lexend text-danger">
                                Username doesnt match &apos;{username}&apos;,
                                only change capitalization.
                            </p>
                        ) : (
                            <></>
                        )}
                    </div>
                </div>
                <div className="flex w-full flex-col justify-center gap-5 sm:flex-row">
                    <button
                        className="button-primary w-full sm:w-1/2"
                        onClick={handleSave}
                    >
                        Save
                    </button>
                    <button
                        className="button-outline button-outline-default w-full sm:w-1/2"
                        onClick={closePopup}
                    >
                        Cancel
                    </button>
                </div>

                {loadingUpdate ? (
                    <div className="absolute left-0 top-0 flex size-full items-center justify-center rounded-lg bg-overlay-loading">
                        <LoadingSpinner size="lg" />
                    </div>
                ) : (
                    <></>
                )}
            </div>
        </Modal>
    );
};

export default EditProfilePopup;

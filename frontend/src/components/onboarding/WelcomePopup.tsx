import { useId, useState } from "react";
import { Link } from "react-router-dom";
import type { MyProfile } from "@playrates/shared";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Field from "../ui/Field";
import { Input } from "../ui/Input";
import AvatarField, { type AvatarChoice } from "../AvatarField";
import {
    useUpdateAvatar,
    useUpdateProfile,
} from "../../hooks/queries/useProfiles";
import { useNotify } from "../../contexts/NotificationContext";
import { BRAND_NAME } from "../../constants/brand";

interface WelcomePopupProps {
    /** Whoever is being welcomed. The picture field needs their name and
     *  colour to draw the placeholder it replaces. */
    profile: Pick<MyProfile, "username" | "firstName" | "avatarUrl" | "accent">;
    /** Walks the popup without saving a thing, for the admin preview. */
    preview?: boolean;
    onClose: () => void;
}

/** The first thing a new account sees: a name and a face, both optional. */
const WelcomePopup = ({
    profile,
    preview = false,
    onClose,
}: WelcomePopupProps) => {
    const titleId = useId();
    const pictureLabelId = useId();
    const [firstName, setFirstName] = useState(profile.firstName ?? "");
    const [avatar, setAvatar] = useState<AvatarChoice>({ kind: "unchanged" });

    const updateProfile = useUpdateProfile();
    const updateAvatar = useUpdateAvatar();
    const notify = useNotify();
    const saving = updateProfile.isPending || updateAvatar.isPending;

    const save = async () => {
        if (preview) return onClose();

        const name = firstName.trim();
        try {
            if (name && name !== (profile.firstName ?? "")) {
                await updateProfile.mutateAsync({ firstName: name });
            }
            if (avatar.kind === "picked") {
                await updateAvatar.mutateAsync(avatar.image);
            }
            onClose();
        } catch {
            // Stays open, so nothing they chose is thrown away.
            notify("Couldn't save that. Try again, or skip for now.", "error");
        }
    };

    return (
        <Modal
            onClose={onClose}
            labelledBy={titleId}
            className="w-full sm:max-w-md"
        >
            <div className="flex flex-col gap-6">
                <div className="pr-11 sm:pr-8">
                    <h2
                        id={titleId}
                        className="font-display text-section text-content"
                    >
                        Welcome to {BRAND_NAME}
                    </h2>
                    <p className="mt-1.5 text-body-sm text-content-secondary">
                        Two things before you explore, both optional.
                    </p>
                </div>

                {/* Styled as Field styles its label, since the picture field
                    has no text input to hang a <label> on. */}
                <div role="group" aria-labelledby={pictureLabelId}>
                    <p
                        id={pictureLabelId}
                        className="mb-2 text-label-sm text-content-muted"
                    >
                        Profile picture
                    </p>
                    <AvatarField
                        username={profile.username}
                        accent={profile.accent}
                        current={profile.avatarUrl}
                        choice={avatar}
                        onChange={setAvatar}
                        disabled={saving}
                    />
                </div>

                <Field label="First name">
                    {(a11y) => (
                        <Input
                            {...a11y}
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            maxLength={40}
                            autoComplete="given-name"
                            disabled={saving}
                        />
                    )}
                </Field>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-center text-label-sm text-content-muted sm:text-left">
                        More in{" "}
                        <Link
                            to="/settings"
                            onClick={onClose}
                            // 44px to press on a phone, from a 15px line.
                            className="relative text-brand underline-offset-2 before:absolute before:-inset-x-1 before:-inset-y-4 before:content-[''] hover:underline"
                        >
                            Settings
                        </Link>
                        .
                    </p>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            disabled={saving}
                            className="w-full sm:w-auto"
                        >
                            Skip for now
                        </Button>
                        <Button
                            onClick={() => void save()}
                            disabled={saving}
                            className="w-full sm:w-auto"
                        >
                            {saving ? "Saving…" : "Save"}
                        </Button>
                    </div>
                </div>
            </div>

            {preview && (
                <p className="mt-5 border-t border-subtle pt-3 text-center text-label-sm text-content-muted">
                    Preview. Nothing you enter here is saved.
                </p>
            )}
        </Modal>
    );
};

export default WelcomePopup;

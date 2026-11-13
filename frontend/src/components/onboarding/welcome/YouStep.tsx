import { useId, useState } from "react";
import Button from "../../ui/Button";
import Field from "../../ui/Field";
import { Input } from "../../ui/Input";
import Toggle from "../../ui/Toggle";
import AvatarField, { type AvatarChoice } from "../../AvatarField";
import { useAuth } from "../../../contexts/AuthContext";
import { useNotify } from "../../../contexts/NotificationContext";
import {
    useUpdateAvatar,
    useUpdateProfile,
} from "../../../hooks/queries/useProfiles";
import { useXpRules } from "../../../hooks/queries/useProgress";
import StepFrame from "./StepFrame";
import { xpFor, type StepProps } from "./stepProps";

/** A name and a face, both optional. */
const YouStep = ({ titleId, preview, onNext }: StepProps) => {
    const profile = useAuth().user!;
    const pictureLabelId = useId();
    const [firstName, setFirstName] = useState(profile.firstName ?? "");
    // Public by default, like the rest of a profile; hidden is one tap.
    const [showName, setShowName] = useState(true);
    const [avatar, setAvatar] = useState<AvatarChoice>({ kind: "unchanged" });
    const updateProfile = useUpdateProfile();
    const updateAvatar = useUpdateAvatar();
    const notify = useNotify();
    const pictureXp = xpFor(useXpRules().data, "avatar");
    const saving = updateProfile.isPending || updateAvatar.isPending;

    const save = async () => {
        if (preview) return onNext();
        const name = firstName.trim();
        try {
            if (name && name !== (profile.firstName ?? "")) {
                await updateProfile.mutateAsync({
                    firstName: name,
                    aboutVisibility: {
                        firstName: showName ? "everyone" : "private",
                    },
                });
            }
            if (avatar.kind === "picked") {
                await updateAvatar.mutateAsync(avatar.image);
            }
            onNext();
        } catch {
            // Stays, so nothing they chose is thrown away.
            notify("Couldn’t save that. Try again, or skip for now.", "error");
        }
    };

    return (
        <StepFrame
            titleId={titleId}
            title="What should we call you?"
            lead="Both optional, both changeable later."
            reward={
                !profile.avatarUrl && pictureXp
                    ? `+${pictureXp} XP for a picture`
                    : undefined
            }
            onSkip={onNext}
            busy={saving}
            primary={
                <Button onClick={() => void save()} disabled={saving}>
                    {saving ? "Saving…" : "Continue"}
                </Button>
            }
        >
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
            <div className="flex flex-col gap-3">
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
                <Toggle
                    checked={showName}
                    onChange={setShowName}
                    label="Show it on my profile"
                    disabled={saving}
                    className="self-start text-body-sm text-content-secondary"
                />
            </div>
        </StepFrame>
    );
};

export default YouStep;

import { useState } from "react";
import AvatarField, { type AvatarChoice } from "../../AvatarField";
import Button from "../../ui/Button";
import Field from "../../ui/Field";
import { Textarea } from "../../ui/Input";
import { useAuth } from "../../../contexts/AuthContext";
import { useNotify } from "../../../contexts/NotificationContext";
import {
    useUpdateAvatar,
    useUpdateProfile,
} from "../../../hooks/queries/useProfiles";
import SheetActions from "./SheetActions";
import type { SheetBodyProps } from "./sheetProps";

const BIO_MAX = 160;

export const PictureBody = ({ onDone, onSkip }: SheetBodyProps) => {
    const user = useAuth().user!;
    const [avatar, setAvatar] = useState<AvatarChoice>({ kind: "unchanged" });
    const updateAvatar = useUpdateAvatar();
    const notify = useNotify();

    const save = async () => {
        if (avatar.kind !== "picked") return;
        try {
            await updateAvatar.mutateAsync(avatar.image);
            onDone();
        } catch {
            notify("Couldn’t save that picture. Try again.", "error");
        }
    };

    return (
        <>
            <AvatarField
                username={user.username}
                accent={user.accent}
                current={user.avatarUrl}
                choice={avatar}
                onChange={setAvatar}
                disabled={updateAvatar.isPending}
            />
            <SheetActions onSkip={onSkip}>
                <Button
                    onClick={() => void save()}
                    disabled={
                        avatar.kind !== "picked" || updateAvatar.isPending
                    }
                    className="w-full sm:w-auto"
                >
                    {updateAvatar.isPending ? "Saving…" : "Save picture"}
                </Button>
            </SheetActions>
        </>
    );
};

export const BioBody = ({ onDone, onSkip }: SheetBodyProps) => {
    const user = useAuth().user!;
    const [bio, setBio] = useState(user.bio ?? "");
    const updateProfile = useUpdateProfile();
    const notify = useNotify();
    const text = bio.trim();

    const save = async () => {
        try {
            await updateProfile.mutateAsync({ bio: text });
            onDone();
        } catch {
            notify("Couldn’t save that. Try again.", "error");
        }
    };

    return (
        <>
            <Field label="Bio" help={`${bio.length} / ${BIO_MAX}`}>
                {(a11y) => (
                    <Textarea
                        {...a11y}
                        rows={3}
                        value={bio}
                        maxLength={BIO_MAX}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Souls games, cosy farming sims, anything with a good map…"
                        autoFocus
                    />
                )}
            </Field>
            <SheetActions onSkip={onSkip}>
                <Button
                    onClick={() => void save()}
                    disabled={!text || updateProfile.isPending}
                    className="w-full sm:w-auto"
                >
                    {updateProfile.isPending ? "Saving…" : "Save bio"}
                </Button>
            </SheetActions>
        </>
    );
};

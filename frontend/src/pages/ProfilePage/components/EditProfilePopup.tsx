import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
    AboutFieldsSchema,
    type AboutField,
    type Profile,
    type ProfileAccent,
} from "@playrates/shared";
import {
    useRemoveAvatar,
    useUpdateAvatar,
    useUpdateProfile,
} from "../../../hooks/queries/useProfiles";
import { useNotify } from "../../../contexts/NotificationContext";
import { ApiError } from "../../../api/client";
import Modal from "../../../components/ui/Modal";
import Button from "../../../components/ui/Button";
import Field from "../../../components/ui/Field";
import { Input, Textarea } from "../../../components/ui/Input";
import AvatarField, {
    type AvatarChoice,
} from "../../../components/AvatarField";
import AccentPicker from "../../../components/ui/AccentPicker";
import { willShowPicture } from "../../../components/avatarChoice";

const ABOUT_INPUTS: {
    field: AboutField;
    label: string;
    placeholder: string;
    type?: "url";
}[] = [
    { field: "firstName", label: "Name", placeholder: "Callum" },
    { field: "pronouns", label: "Pronouns", placeholder: "he/him" },
    { field: "location", label: "Location", placeholder: "Leeds, UK" },
    {
        field: "website",
        label: "Website",
        placeholder: "https://example.com",
        type: "url",
    },
    { field: "discord", label: "Discord", placeholder: "username" },
    {
        field: "steam",
        label: "Steam",
        placeholder: "Profile address or custom name",
    },
];

type AboutValues = Record<AboutField, string>;

/** What is wrong with a field as typed, by the rule the server holds it to.
 *  The first name is not an About field there, so its one rule is here. */
const aboutError = (field: AboutField, value: string): string | undefined => {
    if (field === "firstName") {
        return value.trim().length > 40 ? "40 characters at most" : undefined;
    }
    const checked = AboutFieldsSchema.shape[field].safeParse(value.trim());
    return checked.success ? undefined : checked.error.issues[0]?.message;
};

interface EditProfilePopupProps {
    closePopup: () => void;
    user: Profile;
}

const BIO_LIMIT = 160;

/** The server's own words where it sent some: "That picture is too large"
 *  says what to do; "Couldn't update your profile" does not. */
const reasonFor = (error: unknown, fallback: string): string =>
    error instanceof ApiError &&
    error.status !== undefined &&
    error.status < 500
        ? error.message
        : fallback;

/* A heading, not a <label>: the picture and the colour are each a group of
   controls carrying their own accessible name, and a label pointing at a
   group would have nothing to attach to. */
const Group = ({ label, children }: { label: string; children: ReactNode }) => (
    <div className="flex flex-col">
        <span className="mb-2 text-label-sm text-content-muted">{label}</span>
        {children}
    </div>
);

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
    const [accent, setAccent] = useState<ProfileAccent>(user.accent);
    const [pictureError, setPictureError] = useState<string | null>(null);
    const initialAbout = Object.fromEntries(
        ABOUT_INPUTS.map(({ field }) => [field, user.about[field] ?? ""])
    ) as AboutValues;
    const [about, setAbout] = useState<AboutValues>(initialAbout);
    const aboutErrors = Object.fromEntries(
        ABOUT_INPUTS.map(({ field }) => [
            field,
            aboutError(field, about[field]),
        ])
    ) as Record<AboutField, string | undefined>;
    const aboutInvalid = Object.values(aboutErrors).some(Boolean);
    const changedAbout = Object.fromEntries(
        ABOUT_INPUTS.filter(
            ({ field }) => about[field].trim() !== initialAbout[field]
        ).map(({ field }) => [field, about[field].trim()])
    );

    const sameLetters = username.toLowerCase() === user.username.toLowerCase();
    const fieldsDirty =
        bio !== user.bio ||
        username !== user.username ||
        accent !== user.accent ||
        Object.keys(changedAbout).length > 0;
    const dirty = fieldsDirty || avatar.kind !== "unchanged";
    const saving =
        updateProfile.isPending ||
        updateAvatar.isPending ||
        removeAvatar.isPending;

    const save = async () => {
        if (!sameLetters) return;
        setPictureError(null);
        /* The words first. A picture the server turns away should not take
           the bio and colour down with it; once they are saved the form
           holds only the picture, so Save again retries just that. */
        try {
            // the mutation seeds the profile caches, so the page updates straight away
            if (fieldsDirty) {
                await updateProfile.mutateAsync({
                    username,
                    bio,
                    accent,
                    ...changedAbout,
                });
            }
        } catch (error) {
            notify(reasonFor(error, "Couldn't update your profile"), "error");
            return;
        }
        try {
            if (avatar.kind === "picked") {
                await updateAvatar.mutateAsync(avatar.image);
            } else if (avatar.kind === "removed") {
                await removeAvatar.mutateAsync();
            }
        } catch (error) {
            setPictureError(reasonFor(error, "Your picture didn't save."));
            notify(
                fieldsDirty
                    ? "Saved, apart from the picture"
                    : "Your picture didn't save",
                "error"
            );
            return;
        }
        notify("Profile updated", "success");
        closePopup();
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
                <Group label="Profile Picture">
                    <AvatarField
                        username={user.username}
                        accent={accent}
                        current={user.avatarUrl}
                        choice={avatar}
                        onChange={(choice) => {
                            setPictureError(null);
                            setAvatar(choice);
                        }}
                        disabled={saving}
                        saveError={pictureError}
                    />
                    {/* The colour fills the initial in place of a picture,
                        so it is offered only while there is none. */}
                    {!willShowPicture(user.avatarUrl, avatar) && (
                        <div className="mt-4">
                            <p className="mb-2 text-label text-content-muted">
                                Or a colour behind your initial
                            </p>
                            <AccentPicker
                                label="Colour behind your initial"
                                value={accent}
                                onChange={setAccent}
                                disabled={saving}
                            />
                        </div>
                    )}
                </Group>

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

                <Group label="About you">
                    <div className="grid gap-3 sm:grid-cols-2">
                        {ABOUT_INPUTS.map(
                            ({ field, label, placeholder, type }) => (
                                <Field
                                    key={field}
                                    label={label}
                                    error={aboutErrors[field]}
                                >
                                    {(a11y) => (
                                        <Input
                                            type={type ?? "text"}
                                            value={about[field]}
                                            placeholder={placeholder}
                                            onChange={(e) =>
                                                setAbout({
                                                    ...about,
                                                    [field]: e.target.value,
                                                })
                                            }
                                            {...a11y}
                                        />
                                    )}
                                </Field>
                            )
                        )}
                    </div>
                    <p className="mt-2 text-label-sm text-content-muted">
                        You choose who sees each of these, beside it on your
                        profile or in{" "}
                        <Link
                            to="/settings?section=profile"
                            className="text-content underline hover:text-brand"
                        >
                            Settings
                        </Link>
                        . Your name starts hidden.
                    </p>
                </Group>

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
                        disabled={
                            !dirty || !sameLetters || aboutInvalid || saving
                        }
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

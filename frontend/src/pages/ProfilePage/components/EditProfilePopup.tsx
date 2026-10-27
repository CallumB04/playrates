import { useId, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
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
import { ABOUT_ROWS, aboutError } from "../lib/about";
import AboutFieldInput from "./AboutFieldInput";
import AvatarField, {
    type AvatarChoice,
} from "../../../components/AvatarField";
import AccentPicker from "../../../components/ui/AccentPicker";
import SegmentedChoice from "../../../components/ui/SegmentedChoice";
import { cn } from "../../../lib/cn";
import { willShowPicture } from "../../../components/avatarChoice";

type View = "profile" | "about" | "socials";

type AboutValues = Record<AboutField, string>;

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

const Panel = ({
    id,
    shown,
    children,
}: {
    id: string;
    shown: boolean;
    children: ReactNode;
}) => (
    <div
        id={id}
        role="tabpanel"
        aria-labelledby={`${id}-tab`}
        className={cn(
            "col-start-1 row-start-1 flex flex-col gap-4",
            !shown && "invisible"
        )}
    >
        {children}
    </div>
);

const PrivacyNote = () => (
    <p className="text-label-sm text-content-muted">
        You choose who sees each of these, beside it on your profile or in{" "}
        <Link
            to="/settings?section=privacy"
            className="text-content underline hover:text-brand"
        >
            Settings
        </Link>
        .
    </p>
);

/**
 * The profile editor, in three views so none of them scrolls: the picture
 * and bio, who you are, and where else to find you. One Save covers all
 * three. The username only changes capitalisation here — a real rename has
 * to check availability, so it lives in Settings.
 */
const EditProfilePopup: React.FC<EditProfilePopupProps> = ({
    closePopup,
    user,
}) => {
    const notify = useNotify();
    const [view, setView] = useState<View>("profile");
    const ids = useId();
    const panelId = (of: View) => `${ids}-${of}`;
    const updateProfile = useUpdateProfile();
    const updateAvatar = useUpdateAvatar();
    const removeAvatar = useRemoveAvatar();

    const [bio, setBio] = useState(user.bio);
    const [username, setUsername] = useState(user.username);
    const [avatar, setAvatar] = useState<AvatarChoice>({ kind: "unchanged" });
    const [accent, setAccent] = useState<ProfileAccent>(user.accent);
    const [pictureError, setPictureError] = useState<string | null>(null);
    const initialAbout = Object.fromEntries(
        ABOUT_ROWS.map(({ field }) => [field, user.about[field] ?? ""])
    ) as AboutValues;
    const [about, setAbout] = useState<AboutValues>(initialAbout);
    const aboutErrors = Object.fromEntries(
        ABOUT_ROWS.map(({ field }) => [field, aboutError(field, about[field])])
    ) as Record<AboutField, string | undefined>;
    const aboutInvalid = Object.values(aboutErrors).some(Boolean);
    const invalidIn = (of: View) =>
        ABOUT_ROWS.some(
            ({ field, group }) => group === of && aboutErrors[field]
        );
    const changedAbout = Object.fromEntries(
        ABOUT_ROWS.filter(
            ({ field }) => about[field].trim() !== initialAbout[field]
        ).map(({ field }) => [field, about[field].trim()])
    );

    const inputsFor = (of: View, half = false) =>
        ABOUT_ROWS.filter((row) => row.group === of && !!row.half === half).map(
            (row) => (
                <AboutFieldInput
                    key={row.field}
                    row={row}
                    value={about[row.field]}
                    onChange={(value) =>
                        setAbout({ ...about, [row.field]: value })
                    }
                    error={aboutErrors[row.field]}
                />
            )
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

            <SegmentedChoice
                label="Edit profile views"
                segments={[
                    { value: "profile", label: "Profile" },
                    {
                        value: "about",
                        label: "About you",
                        flagged: invalidIn("about") || !sameLetters,
                    },
                    {
                        value: "socials",
                        label: "Socials",
                        flagged: invalidIn("socials"),
                    },
                ]}
                value={view}
                onChange={setView}
                panelId={panelId}
                fill
                className="mt-3"
            />

            {/* Stacked in one cell, so the popup is as tall as its tallest
                view and doesn't jump between them. The hidden ones keep
                their place, and their state. */}
            <div className="mt-4 grid">
                <Panel id={panelId("profile")} shown={view === "profile"}>
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
                </Panel>
                <Panel id={panelId("about")} shown={view === "about"}>
                    <div className="grid grid-cols-2 gap-3">
                        {inputsFor("about", true)}
                    </div>
                    {inputsFor("about")}
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
                    <PrivacyNote />
                </Panel>
                <Panel id={panelId("socials")} shown={view === "socials"}>
                    {inputsFor("socials")}
                    <PrivacyNote />
                </Panel>
            </div>

            <div className="mt-4 border-t border-subtle pt-4">
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

import { useId, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { SteamPreview } from "@playrates/shared";
import { ApiError, previewSteamLibrary } from "../../api";
import Button from "../ui/Button";
import { Input } from "../ui/Input";
import Modal from "../ui/Modal";
import SteamReview from "./SteamReview";

const failure = (error: unknown): string => {
    if (error instanceof ApiError) {
        if (error.code === "steam_private") {
            return "That library is private. In Steam, set Game details to Public in your profile’s Privacy Settings, then try again.";
        }
        if (error.status === 404) return "We couldn’t find that Steam profile.";
        if (error.status === 422) {
            return "That isn’t a Steam profile link, name or id.";
        }
        if (error.status === 429)
            return "That’s a lot of looking. Try again in a minute.";
    }
    return "Steam didn’t answer. Try again in a moment.";
};

/**
 * Bring in a Steam library: find it, look it over, add it. Nothing is
 * added until the button is pressed.
 */
const SteamImportModal = ({
    initialProfile = "",
    onClose,
}: {
    initialProfile?: string;
    onClose: () => void;
}) => {
    const titleId = useId();
    const [profile, setProfile] = useState(initialProfile);
    const [preview, setPreview] = useState<SteamPreview | null>(null);

    const find = useMutation({
        mutationFn: () => previewSteamLibrary(profile),
        onSuccess: setPreview,
    });

    return (
        <Modal
            onClose={onClose}
            labelledBy={titleId}
            className="w-full max-w-2xl"
        >
            <h2
                id={titleId}
                className="border-b border-subtle pb-3 font-display text-section text-content"
            >
                Import from Steam
            </h2>

            {!preview ? (
                <form
                    className="flex flex-col gap-4 pt-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        find.mutate();
                    }}
                >
                    <p className="text-body-sm text-content-secondary">
                        Paste your Steam profile link, or your custom profile
                        name. Your game details need to be public on Steam.
                        You’ll see everything before anything is added.
                    </p>
                    <label className="flex flex-col gap-2">
                        <span className="text-label text-content-secondary">
                            Steam profile
                        </span>
                        <Input
                            value={profile}
                            onChange={(event) => setProfile(event.target.value)}
                            placeholder="steamcommunity.com/id/yourname"
                            autoComplete="off"
                            aria-invalid={find.isError || undefined}
                            maxLength={200}
                        />
                    </label>
                    {find.isError && (
                        <p role="alert" className="text-body-sm text-danger">
                            {failure(find.error)}
                        </p>
                    )}
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            className="w-full sm:w-auto"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                profile.trim().length < 2 || find.isPending
                            }
                            className="w-full sm:w-auto"
                        >
                            {find.isPending ? "Looking…" : "Find my games"}
                        </Button>
                    </div>
                </form>
            ) : (
                <SteamReview preview={preview} onClose={onClose} />
            )}
        </Modal>
    );
};

export default SteamImportModal;

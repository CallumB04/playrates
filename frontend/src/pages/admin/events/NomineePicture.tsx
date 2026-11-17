import { useRef } from "react";
import { ImagePlus, X } from "lucide-react";
import type { AwardNominee } from "@playrates/shared";
import { deleteAdminNomineeImage, uploadAdminNomineeImage } from "../../../api";
import { useAdminEventChange } from "../../../hooks/queries/useEvents";
import { useNotify } from "../../../contexts/NotificationContext";
import { compressAvatar, rejectReason } from "../../../lib/avatarImage";
import { AVATAR_SOURCE_TYPES } from "@playrates/shared";
import { cn } from "../../../lib/cn";

/**
 * The picture of a nominee that isn't a game, in its row: the thumbnail is
 * the button that picks one, compressed here before it goes, as a profile
 * picture is. Optional; without one the card draws its category's mark.
 */
const NomineePicture = ({ nominee }: { nominee: AwardNominee }) => {
    const input = useRef<HTMLInputElement>(null);
    const notify = useNotify();
    const name = nominee.label ?? "this nominee";
    const upload = useAdminEventChange((file: Blob) =>
        uploadAdminNomineeImage(nominee.id, file)
    );
    const remove = useAdminEventChange(() =>
        deleteAdminNomineeImage(nominee.id)
    );

    const choose = async (file: File | undefined) => {
        if (!file) return;
        const refused = rejectReason(file);
        if (refused) {
            notify(refused, "error");
            return;
        }
        try {
            const image = await compressAvatar(file);
            upload.mutate(image, {
                onError: () => notify("That picture didn’t upload", "error"),
            });
        } catch {
            notify("That picture couldn’t be read", "error");
        }
    };

    return (
        <span className="relative shrink-0">
            <button
                type="button"
                onClick={() => input.current?.click()}
                disabled={upload.isPending}
                aria-label={
                    nominee.imageUrl
                        ? `Change the picture of ${name}`
                        : `Add a picture of ${name}`
                }
                className={cn(
                    "grid aspect-3/4 w-10 place-items-center overflow-hidden rounded-sm transition-colors",
                    nominee.imageUrl
                        ? "hover:opacity-80"
                        : "border border-dashed border-strong text-content-muted hover:border-brand hover:text-brand-text"
                )}
            >
                {nominee.imageUrl ? (
                    <img
                        src={nominee.imageUrl}
                        alt=""
                        className="size-full object-cover"
                    />
                ) : (
                    <ImagePlus size={16} aria-hidden />
                )}
            </button>
            {nominee.imageUrl && (
                <button
                    type="button"
                    onClick={() =>
                        remove.mutate(undefined, {
                            onError: () =>
                                notify("The picture didn’t come off", "error"),
                        })
                    }
                    aria-label={`Remove the picture of ${name}`}
                    className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-surface-raised text-content-muted shadow-plate ring-1 ring-subtle before:absolute before:-inset-3 before:content-[''] hover:text-content"
                >
                    <X size={11} aria-hidden />
                </button>
            )}
            <input
                ref={input}
                type="file"
                accept={AVATAR_SOURCE_TYPES.join(",")}
                className="hidden"
                onChange={(e) => {
                    void choose(e.target.files?.[0]);
                    e.target.value = "";
                }}
            />
        </span>
    );
};

export default NomineePicture;

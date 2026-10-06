import { useState } from "react";
import { BellRing, Check } from "lucide-react";
import { patchNoteAnnouncement, type AdminPatchNote } from "@playrates/shared";
import ConfirmPopup from "../ui/ConfirmPopup";
import { useNotify } from "../../contexts/NotificationContext";
import { useAnnouncePatchNote } from "../../hooks/queries/useAdmin";
import { formatCount, formatDate } from "../../lib/format";
import { ActionButton } from "./MessageItem";

/**
 * Telling everyone about one patch notes entry, from the entry itself. Once
 * sent it stays sent: the server turns a second send away, so this shows
 * when it went instead of offering it again.
 */
const PatchNoteNotify = ({ note }: { note: AdminPatchNote }) => {
    const [confirming, setConfirming] = useState(false);
    const announce = useAnnouncePatchNote();
    const notify = useNotify();
    const sent = note.announcement;

    if (sent) {
        return (
            <span className="inline-flex min-h-11 items-center gap-1.5 px-2.5 text-label text-content-muted sm:min-h-8">
                <Check size={14} aria-hidden className="text-success" />
                Notified {formatDate(sent.createdAt)}
            </span>
        );
    }

    const message = patchNoteAnnouncement(note.title, note.link);

    return (
        <>
            <ActionButton
                onClick={() => setConfirming(true)}
                icon={<BellRing size={14} aria-hidden />}
            >
                Send notification
            </ActionButton>
            {confirming && (
                <ConfirmPopup
                    title="Tell everyone about these notes?"
                    body={`“${message.title}” goes into every inbox now, and opens the notes at this entry. It can only go out once.`}
                    confirmLabel="Send"
                    tone="neutral"
                    isPending={announce.isPending}
                    onConfirm={() =>
                        announce.mutate(note.messageId, {
                            onSuccess: (result) => {
                                setConfirming(false);
                                notify(
                                    `In ${formatCount(result.announcement?.recipientCount ?? 0)} inboxes`,
                                    "success"
                                );
                            },
                            onError: () => {
                                setConfirming(false);
                                notify("It didn’t send", "error");
                            },
                        })
                    }
                    onClose={() => setConfirming(false)}
                />
            )}
        </>
    );
};

export default PatchNoteNotify;

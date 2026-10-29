import { useState } from "react";
import { BellRing, Check } from "lucide-react";
import { patchNoteAnnouncement, type AdminPatchNote } from "@playrates/shared";
import Button from "../ui/Button";
import ConfirmPopup from "../ui/ConfirmPopup";
import Toggle from "../ui/Toggle";
import { useNotify } from "../../contexts/NotificationContext";
import {
    useAnnouncePatchNote,
    useEmailAudience,
    useSendTestPatchNote,
} from "../../hooks/queries/useAdmin";
import { formatDate } from "../../lib/format";
import {
    emailedTo,
    sentNotice,
    testNotice,
} from "../../pages/admin/lib/broadcastCopy";
import { ActionButton } from "./MessageItem";

/**
 * Telling everyone about one patch notes entry, from the entry itself. Once
 * sent it stays sent: the server turns a second send away, so this shows
 * when it went instead of offering it again.
 */
const PatchNoteNotify = ({ note }: { note: AdminPatchNote }) => {
    const [confirming, setConfirming] = useState(false);
    // On by default: patch notes are what members turned news emails on for.
    const [email, setEmail] = useState(true);
    const announce = useAnnouncePatchNote();
    const test = useSendTestPatchNote();
    const { data: audience } = useEmailAudience(confirming);
    const notify = useNotify();
    const sent = note.announcement;

    if (sent) {
        return (
            <span className="inline-flex min-h-11 items-center gap-1.5 px-2.5 text-label text-content-muted sm:min-h-8">
                <Check size={14} aria-hidden className="text-success" />
                Notified {formatDate(sent.createdAt)}
                {sent.emailedAt && " · emailed"}
            </span>
        );
    }

    const message = patchNoteAnnouncement(note.title, note.link);
    const send = { messageId: note.messageId, email };

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
                    body={
                        email
                            ? `“${message.title}” goes into every inbox now, and by email to ${emailedTo(audience)}. It opens the notes at this entry, and can only go out once.`
                            : `“${message.title}” goes into every inbox now, and opens the notes at this entry. It can only go out once.`
                    }
                    confirmLabel="Send"
                    tone="neutral"
                    isPending={announce.isPending}
                    onConfirm={() =>
                        announce.mutate(send, {
                            onSuccess: (result) => {
                                setConfirming(false);
                                notify(
                                    sentNotice(
                                        result.announcement?.recipientCount ??
                                            0,
                                        email
                                    ),
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
                >
                    {/* The test sits by the switch so it goes out the way
                        the real one will. */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <Toggle
                            checked={email}
                            onChange={setEmail}
                            label="Also send as an email"
                            className="self-start sm:self-auto"
                        />
                        <Button
                            variant="ghost"
                            disabled={test.isPending || announce.isPending}
                            onClick={() =>
                                test.mutate(send, {
                                    onSuccess: () =>
                                        notify(testNotice(email), "success"),
                                    onError: () =>
                                        notify("The test didn’t send", "error"),
                                })
                            }
                            className="w-full sm:w-auto"
                        >
                            Send test to me
                        </Button>
                    </div>
                </ConfirmPopup>
            )}
        </>
    );
};

export default PatchNoteNotify;

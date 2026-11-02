import { useState } from "react";
import { BellRing, Check } from "lucide-react";
import { patchNoteAnnouncement, type AdminPatchNote } from "@playrates/shared";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import SegmentedChoice from "../ui/SegmentedChoice";
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

type Audience = "me" | "everyone";

const AUDIENCES = [
    { value: "me" as const, label: "Just me" },
    { value: "everyone" as const, label: "Everyone" },
];

/**
 * Telling people about one patch notes entry, from the entry itself: to
 * yourself first, to see it as they will, then to everyone. Once it has
 * gone to everyone it stays sent: the server turns a second send away, so
 * this shows when it went instead of offering it again.
 */
const PatchNoteNotify = ({ note }: { note: AdminPatchNote }) => {
    const [open, setOpen] = useState(false);
    // Just you to start: everyone can't be unsent, by email at least.
    const [audience, setAudience] = useState<Audience>("me");
    // On by default: patch notes are what members turned news emails on for.
    const [email, setEmail] = useState(true);
    const announce = useAnnouncePatchNote();
    const test = useSendTestPatchNote();
    const { data: subscribers } = useEmailAudience(open);
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
    const pending = announce.isPending || test.isPending;
    const close = () => setOpen(false);

    const explained =
        audience === "me"
            ? email
                ? "It goes into your bell and your email, and nobody else’s, so you can see it as everyone will."
                : "It goes into your bell, and nobody else’s, so you can see it as everyone will."
            : email
              ? `“${message.title}” goes into every inbox now, and by email to ${emailedTo(subscribers)}. It opens the notes at this entry, and can only go out once.`
              : `“${message.title}” goes into every inbox now, and opens the notes at this entry. It can only go out once.`;

    const submit = () => {
        if (audience === "me") {
            test.mutate(send, {
                onSuccess: () => {
                    close();
                    notify(testNotice(email), "success");
                },
                onError: () => notify("The test didn’t send", "error"),
            });
            return;
        }
        announce.mutate(send, {
            onSuccess: (result) => {
                close();
                notify(
                    sentNotice(result.announcement?.recipientCount ?? 0, email),
                    "success"
                );
            },
            onError: () => notify("It didn’t send", "error"),
        });
    };

    const titleId = `notify-${note.messageId}`;
    return (
        <>
            <ActionButton
                onClick={() => setOpen(true)}
                icon={<BellRing size={14} aria-hidden />}
            >
                Send notification
            </ActionButton>
            {open && (
                <Modal
                    onClose={close}
                    labelledBy={titleId}
                    className="w-full max-w-md"
                >
                    <h2
                        id={titleId}
                        className="border-b border-subtle pb-3 font-display text-section text-content"
                    >
                        Send these patch notes
                    </h2>
                    <div className="flex flex-col gap-4 pt-4">
                        <SegmentedChoice
                            segments={AUDIENCES}
                            value={audience}
                            onChange={setAudience}
                            label="Who gets it"
                            fill
                        />
                        <Toggle
                            checked={email}
                            onChange={setEmail}
                            label="Also send as an email"
                            className="self-start"
                        />
                        <p className="text-body-sm leading-relaxed text-content-secondary">
                            {explained}
                        </p>
                    </div>
                    <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Button
                            variant="secondary"
                            onClick={close}
                            disabled={pending}
                        >
                            Cancel
                        </Button>
                        <Button onClick={submit} disabled={pending}>
                            {audience === "me"
                                ? "Send to me"
                                : "Send to everyone"}
                        </Button>
                    </div>
                </Modal>
            )}
        </>
    );
};

export default PatchNoteNotify;

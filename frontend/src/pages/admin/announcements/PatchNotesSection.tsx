import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Megaphone } from "lucide-react";
import { patchNoteAnnouncement, type AdminPatchNote } from "@playrates/shared";
import { cardClass } from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import ConfirmPopup from "../../../components/ui/ConfirmPopup";
import { EmptyNote } from "../../../components/ui/EmptyPlate";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import IconMark from "../../../components/notifications/IconMark";
import { threadPath } from "../../../components/community/paths";
import { useNotify } from "../../../contexts/NotificationContext";
import { usePatchNotes } from "../../../hooks/queries/useCommunity";
import {
    useAdminPatchNotes,
    useAnnouncePatchNote,
    useSendTestPatchNote,
} from "../../../hooks/queries/useAdmin";
import { cn } from "../../../lib/cn";
import { formatCount, formatDate } from "../../../lib/format";
import { share } from "../lib/adminFormat";
import SectionHeader from "../components/SectionHeader";
import { SeeAllButton, SeeAllModal } from "../components/SeeAll";
import { useSeeAll } from "../components/useSeeAll";

const SHOWN = 5;

/** Sent or not, in words; the dot only repeats it. */
const Status = ({ note }: { note: AdminPatchNote }) => {
    const sent = note.announcement;
    return (
        <span className="inline-flex basis-full items-center gap-1.5 sm:basis-auto">
            <span
                aria-hidden
                className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    sent ? "bg-success" : "bg-warning"
                )}
            />
            {sent ? (
                <span>
                    Sent {formatDate(sent.createdAt)} to{" "}
                    <span className="font-mono">
                        {formatCount(sent.recipientCount)}
                    </span>{" "}
                    · read by{" "}
                    <span className="font-mono">
                        {formatCount(sent.readCount)}
                    </span>{" "}
                    ({share(sent.readCount, sent.recipientCount)})
                </span>
            ) : (
                <span className="font-medium text-warning">Not sent yet</span>
            )}
        </span>
    );
};

const PatchNoteRow = ({
    note,
    reach,
}: {
    note: AdminPatchNote;
    reach: number | undefined;
}) => {
    const [confirming, setConfirming] = useState(false);
    const announce = useAnnouncePatchNote();
    const test = useSendTestPatchNote();
    const notify = useNotify();
    const title = note.title ?? "Untitled entry";
    // What the bell will say, so the confirmation can quote it.
    const message = patchNoteAnnouncement(note.title, note.link);

    return (
        <li className="flex flex-col gap-3 border-b border-subtle py-3.5 last:border-b-0 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex min-w-0 flex-1 gap-3">
                <IconMark icon={Megaphone} tone="text-accent-content" />
                <div className="min-w-0">
                    <Link
                        to={note.link}
                        className={cn(
                            "group relative inline-flex max-w-full items-center gap-1 text-body-sm font-medium text-content before:absolute before:-inset-2 before:content-[''] hover:text-brand",
                            !note.title && "text-content-muted italic"
                        )}
                    >
                        <span className="truncate">{title}</span>
                        <ArrowUpRight
                            size={14}
                            aria-hidden
                            className="shrink-0 text-content-muted group-hover:text-brand"
                        />
                    </Link>
                    <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-label-sm text-content-muted">
                        <span>
                            Posted {formatDate(note.createdAt)}
                            {note.editedAt && " · edited since"}
                        </span>
                        <span aria-hidden className="hidden sm:inline">
                            ·
                        </span>
                        <Status note={note} />
                    </p>
                </div>
            </div>

            {!note.announcement && (
                <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row">
                    <Button
                        variant="ghost"
                        disabled={test.isPending}
                        onClick={() =>
                            test.mutate(note.messageId, {
                                onSuccess: () =>
                                    notify(
                                        "In your bell, and nobody else’s",
                                        "success"
                                    ),
                                onError: () =>
                                    notify("The test didn’t send", "error"),
                            })
                        }
                        className="w-full sm:w-auto"
                    >
                        Send test to me
                    </Button>
                    <Button
                        onClick={() => setConfirming(true)}
                        disabled={announce.isPending}
                        className="w-full sm:w-auto"
                    >
                        {reach
                            ? `Send to ${formatCount(reach)} people`
                            : "Send to everyone"}
                    </Button>
                </div>
            )}

            {confirming && (
                <ConfirmPopup
                    title="Tell everyone about these notes?"
                    body={`“${message.title}” goes into ${reach ? `all ${formatCount(reach)}` : "every"} inboxes now, and opens the notes at this entry. You can take it back from Sent.`}
                    confirmLabel="Send"
                    tone="neutral"
                    isPending={announce.isPending}
                    onConfirm={() =>
                        announce.mutate(note.messageId, {
                            onSuccess: (sent) => {
                                setConfirming(false);
                                notify(
                                    `In ${formatCount(sent.announcement?.recipientCount ?? 0)} inboxes`,
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
        </li>
    );
};

/**
 * Every entry in the patch notes, and whether everyone has been told of it.
 * An entry goes out as an ordinary announcement, so once sent it also sits
 * in Sent, where taking it back frees it to go out again.
 */
const PatchNotesSection = ({ reach }: { reach: number | undefined }) => {
    const notes = useAdminPatchNotes();
    const { data: summary } = usePatchNotes();
    const all = useSeeAll();
    const list = notes.data ?? [];
    const unsent = list.filter((n) => !n.announcement).length;

    return (
        <section className="mt-10">
            <SectionHeader
                title="Patch notes"
                trailing={
                    list.length > SHOWN && <SeeAllButton onClick={all.show} />
                }
            />
            {notes.isPending ? (
                <TextSkeleton lines={3} />
            ) : list.length === 0 ? (
                <EmptyNote>
                    No patch notes yet. Entries posted in{" "}
                    {summary ? (
                        <Link
                            to={threadPath(summary.thread.id)}
                            className="font-medium text-brand hover:underline"
                        >
                            the patch notes
                        </Link>
                    ) : (
                        "the patch notes"
                    )}{" "}
                    show here, ready to send.
                </EmptyNote>
            ) : (
                <>
                    {unsent > 0 && (
                        <p className="mb-3 text-label text-content-secondary">
                            <span className="font-mono text-warning">
                                {unsent}
                            </span>{" "}
                            {unsent === 1 ? "entry hasn’t" : "entries haven’t"}{" "}
                            gone out yet.
                        </p>
                    )}
                    <ul className={cardClass("flex flex-col py-1")}>
                        {list.slice(0, SHOWN).map((note) => (
                            <PatchNoteRow
                                key={note.messageId}
                                note={note}
                                reach={reach}
                            />
                        ))}
                    </ul>
                </>
            )}

            {all.open && (
                <SeeAllModal title="Every patch notes entry" onClose={all.hide}>
                    <ul className="flex flex-col">
                        {list.map((note) => (
                            <PatchNoteRow
                                key={note.messageId}
                                note={note}
                                reach={reach}
                            />
                        ))}
                    </ul>
                </SeeAllModal>
            )}
        </section>
    );
};

export default PatchNotesSection;

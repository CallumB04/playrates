import { useMemo, useState } from "react";
import { FlaskConical, Send, Undo2 } from "lucide-react";
import {
    ANNOUNCEMENT_BODY_MAX,
    ANNOUNCEMENT_TITLE_MAX,
    ANNOUNCEMENT_TONES,
    AnnouncementInputSchema,
    type Announcement,
    type AnnouncementNotification,
    type AnnouncementTone,
} from "@playrates/shared";
import Panel from "../../../components/ui/Panel";
import Button from "../../../components/ui/Button";
import Field from "../../../components/ui/Field";
import Dropdown from "../../../components/ui/Dropdown";
import ConfirmPopup from "../../../components/ui/ConfirmPopup";
import EmptyPlate from "../../../components/ui/EmptyPlate";
import { Input, Textarea } from "../../../components/ui/Input";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import NotificationItem from "../../../components/notifications/NotificationItem";
import { ANNOUNCEMENT_PRESENTATION } from "../../../components/notifications/announcementTones";
import { useNotify } from "../../../contexts/NotificationContext";
import { cn } from "../../../lib/cn";
import { formatCount, formatDate } from "../../../lib/format";
import {
    useAdminOverview,
    useAnnouncements,
    useRetractAnnouncement,
    useSendAnnouncement,
    useSendTestAnnouncement,
} from "../../../hooks/queries/useAdmin";
import AdminPageHeader from "../components/AdminPageHeader";
import { composeAnnouncement } from "./composeAnnouncement";

const Counter = ({ length, max }: { length: number; max: number }) => (
    <span
        aria-live="polite"
        className={cn(
            "font-mono text-label-sm tabular-nums",
            length > max ? "font-semibold text-danger" : length > max * 0.9 ? "text-warning" : "text-content-muted"
        )}
    >
        {length}/{max}
    </span>
);

const HistoryRow = ({ announcement }: { announcement: Announcement }) => {
    const [confirming, setConfirming] = useState(false);
    const retract = useRetractAnnouncement();
    const notify = useNotify();
    const { icon: Icon, tone, label } = ANNOUNCEMENT_PRESENTATION[announcement.tone];
    const retracted = announcement.retractedAt !== null;

    return (
        <li className={cn("flex flex-col gap-3 rounded-md border border-subtle bg-surface-raised p-3 sm:flex-row sm:items-start", retracted && "opacity-70")}>
            <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-sunken", tone)}>
                <Icon size={16} aria-label={label} />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-body-sm font-medium break-words text-content">{announcement.title}</p>
                <p className="text-body-sm break-words text-content-secondary">{announcement.body}</p>
                <p className="mt-1 text-label-sm text-content-muted">
                    {formatDate(announcement.createdAt)} · sent to {formatCount(announcement.recipientCount)} ·{" "}
                    {retracted
                        ? `retracted ${formatDate(announcement.retractedAt)}`
                        : `read by ${formatCount(announcement.readCount)}`}
                    {announcement.link && ` · links to ${announcement.link}`}
                </p>
            </div>
            {!retracted && (
                <Button variant="ghost" size="sm" onClick={() => setConfirming(true)} className="w-full sm:w-auto">
                    <Undo2 size={14} aria-hidden />
                    Retract
                </Button>
            )}
            {confirming && (
                <ConfirmPopup
                    title="Retract this announcement?"
                    body={`“${announcement.title}” comes out of all ${formatCount(announcement.recipientCount)} inboxes, read or not.`}
                    confirmLabel="Retract"
                    isPending={retract.isPending}
                    onConfirm={() =>
                        retract.mutate(announcement.id, {
                            onSuccess: () => {
                                setConfirming(false);
                                notify("Announcement retracted", "success");
                            },
                            onError: () => notify("Couldn't retract it", "error"),
                        })
                    }
                    onClose={() => setConfirming(false)}
                />
            )}
        </li>
    );
};

const TONE_OPTIONS = ANNOUNCEMENT_TONES.map((value) => ({
    value,
    label: ANNOUNCEMENT_PRESENTATION[value].label,
    hint: ANNOUNCEMENT_PRESENTATION[value].hint,
    icon: ANNOUNCEMENT_PRESENTATION[value].icon,
}));

const AnnouncementsPage = () => {
    const [tone, setTone] = useState<AnnouncementTone>("update");
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [link, setLink] = useState("");
    const [confirming, setConfirming] = useState(false);

    const notify = useNotify();
    const send = useSendAnnouncement();
    const test = useSendTestAnnouncement();
    const history = useAnnouncements();
    // Reach is everyone with an account, which the overview already counts.
    const { data: overview } = useAdminOverview("30d");

    const draft = composeAnnouncement({ tone, title, body, link });
    const parsed = AnnouncementInputSchema.safeParse(draft);
    const linkError =
        link.trim() !== "" && !parsed.success && parsed.error.flatten().fieldErrors.link
            ? "An in-app path, like /community"
            : undefined;

    const preview = useMemo<AnnouncementNotification>(
        () => ({
            kind: "announcement",
            id: -1,
            createdAt: new Date().toISOString(),
            readAt: null,
            archivedAt: null,
            tone,
            title: title.trim() || "Your title",
            body: body.trim() || "What you want everyone to know.",
            link: draft.link,
            isTest: false,
        }),
        [tone, title, body, draft.link]
    );

    const reset = () => {
        setTitle("");
        setBody("");
        setLink("");
    };

    const sendTest = () => {
        if (!parsed.success) return;
        test.mutate(parsed.data, {
            onSuccess: () => notify("Sent to your bell only", "success"),
            onError: () => notify("Couldn't send the test", "error"),
        });
    };

    const sendAll = () => {
        if (!parsed.success) return;
        send.mutate(parsed.data, {
            onSuccess: (sent) => {
                setConfirming(false);
                reset();
                notify(`Sent to ${formatCount(sent.recipientCount)} people`, "success");
            },
            onError: () => {
                setConfirming(false);
                notify("Couldn't send it", "error");
            },
        });
    };

    const reach = overview?.totals.users;

    return (
        <>
            <AdminPageHeader
                title="Announcements"
                description="One message to every account, in the bell alongside everything else."
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
                <Panel title="Write one">
                    <div className="flex flex-col gap-4">
                        <Field label="Type">
                            {(a11y) => (
                                <Dropdown
                                    id={a11y.id}
                                    options={TONE_OPTIONS}
                                    value={tone}
                                    onChange={(value) => setTone(value as AnnouncementTone)}
                                />
                            )}
                        </Field>

                        <div className="flex flex-col gap-1">
                            <Field label="Title">
                                {(a11y) => (
                                    <Input
                                        {...a11y}
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Lists are here"
                                        aria-invalid={title.trim().length > ANNOUNCEMENT_TITLE_MAX || undefined}
                                    />
                                )}
                            </Field>
                            <span className="self-end">
                                <Counter length={title.trim().length} max={ANNOUNCEMENT_TITLE_MAX} />
                            </span>
                        </div>

                        <div className="flex flex-col gap-1">
                            <Field label="Message">
                                {(a11y) => (
                                    <Textarea
                                        {...a11y}
                                        value={body}
                                        onChange={(e) => setBody(e.target.value)}
                                        rows={3}
                                        placeholder="Make a list of anything and share it with your friends."
                                        aria-invalid={body.trim().length > ANNOUNCEMENT_BODY_MAX || undefined}
                                    />
                                )}
                            </Field>
                            <span className="self-end">
                                <Counter length={body.trim().length} max={ANNOUNCEMENT_BODY_MAX} />
                            </span>
                        </div>

                        <Field
                            label="Link (optional)"
                            help="Where tapping it goes. A path on PlayRates, never another site."
                            error={linkError}
                        >
                            {(a11y) => (
                                <Input
                                    {...a11y}
                                    value={link}
                                    onChange={(e) => setLink(e.target.value)}
                                    placeholder="/community"
                                    autoCapitalize="off"
                                    autoCorrect="off"
                                    spellCheck={false}
                                />
                            )}
                        </Field>

                        <div className="flex flex-col gap-2 border-t border-subtle pt-4 sm:flex-row sm:justify-end">
                            <Button
                                variant="secondary"
                                onClick={sendTest}
                                disabled={!parsed.success || test.isPending}
                                className="w-full sm:w-auto"
                            >
                                <FlaskConical size={15} aria-hidden />
                                Send test to me
                            </Button>
                            <Button
                                onClick={() => setConfirming(true)}
                                disabled={!parsed.success || send.isPending}
                                className="w-full sm:w-auto"
                            >
                                <Send size={15} aria-hidden />
                                {reach ? `Send to ${formatCount(reach)} people` : "Send to everyone"}
                            </Button>
                        </div>
                    </div>
                </Panel>

                <div className="flex flex-col gap-2 lg:sticky lg:top-24 lg:self-start">
                    <h3 className="text-label font-medium text-content-secondary">
                        In the bell
                    </h3>
                    {/* The popout's own width and padding, so what fits here
                        fits there. */}
                    <div className="w-full max-w-[24rem] rounded-lg border border-subtle bg-surface-raised p-3 shadow-e2">
                        <ul>
                            <NotificationItem notification={preview} onNavigate={() => undefined} preview />
                        </ul>
                    </div>
                    <p className="text-label-sm text-content-muted">
                        On a phone the bell is a full-width sheet, so this is the
                        tightest it gets.
                    </p>
                </div>
            </div>

            <section className="mt-8 flex flex-col gap-3">
                <h3 className="text-section font-semibold text-content">Sent</h3>
                {history.isPending ? (
                    <TextSkeleton lines={4} />
                ) : !history.data?.length ? (
                    <EmptyPlate title="Nothing sent yet" body="Tests don't appear here, only the real thing." />
                ) : (
                    <ul className="flex flex-col gap-2">
                        {history.data.map((a) => (
                            <HistoryRow key={a.id} announcement={a} />
                        ))}
                    </ul>
                )}
            </section>

            {confirming && parsed.success && (
                <ConfirmPopup
                    title="Send to everyone?"
                    body={`“${parsed.data.title}” goes into ${reach ? `all ${formatCount(reach)}` : "every"} inboxes now. You can retract it later, but anyone who has already read it will have seen it.`}
                    confirmLabel="Send"
                    tone="neutral"
                    isPending={send.isPending}
                    onConfirm={sendAll}
                    onClose={() => setConfirming(false)}
                />
            )}
        </>
    );
};

export default AnnouncementsPage;

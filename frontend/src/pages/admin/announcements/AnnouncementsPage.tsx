import { useMemo, useState } from "react";
import {
    ANNOUNCEMENT_BODY_MAX,
    ANNOUNCEMENT_TITLE_MAX,
    ANNOUNCEMENT_TONES,
    AnnouncementInputSchema,
    type Announcement,
    type AnnouncementNotification,
    type AnnouncementTone,
} from "@playrates/shared";
import { cardClass } from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Field from "../../../components/ui/Field";
import Dropdown from "../../../components/ui/Dropdown";
import ConfirmPopup from "../../../components/ui/ConfirmPopup";
import { EmptyNote } from "../../../components/ui/EmptyPlate";
import { Input, Textarea } from "../../../components/ui/Input";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import { popoverClass } from "../../../components/ui/popover";
import IconMark from "../../../components/notifications/IconMark";
import NotificationItem from "../../../components/notifications/NotificationItem";
import { ANNOUNCEMENT_PRESENTATION } from "../../../components/notifications/announcementTones";
import { useNotify } from "../../../contexts/NotificationContext";
import { cn } from "../../../lib/cn";
import { formatCount, formatDate } from "../../../lib/format";
import { share } from "../lib/adminFormat";
import {
    useAdminOverview,
    useAnnouncements,
    useRetractAnnouncement,
    useSendAnnouncement,
    useSendTestAnnouncement,
} from "../../../hooks/queries/useAdmin";
import AdminPageHeader from "../components/AdminPageHeader";
import SectionHeader from "../components/SectionHeader";
import { composeAnnouncement } from "./composeAnnouncement";

/** Counts against the limit the bell was laid out for; it only takes colour
 *  as it gets close. */
const Counter = ({ length, max }: { length: number; max: number }) => (
    <span
        aria-live="polite"
        className={cn(
            "font-mono text-label-sm",
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
    const { icon, tone } = ANNOUNCEMENT_PRESENTATION[announcement.tone];
    const retracted = announcement.retractedAt !== null;

    return (
        <li className="flex flex-col gap-3 border-b border-subtle py-3.5 last:border-b-0 sm:flex-row sm:items-start sm:gap-4">
            <div className={cn("flex min-w-0 flex-1 gap-3", retracted && "opacity-60")}>
                <IconMark icon={icon} tone={tone} />
                <div className="min-w-0">
                    <p className="text-body-sm font-medium break-words text-content">{announcement.title}</p>
                    <p className="mt-0.5 text-body-sm break-words text-content-secondary">{announcement.body}</p>
                    <p className="mt-1.5 text-label-sm text-content-muted">
                        {formatDate(announcement.createdAt)} · to{" "}
                        <span className="font-mono">{formatCount(announcement.recipientCount)}</span>
                        {retracted ? (
                            <> · taken back {formatDate(announcement.retractedAt)}</>
                        ) : (
                            <>
                                {" "}· read by <span className="font-mono">{formatCount(announcement.readCount)}</span>{" "}
                                ({share(announcement.readCount, announcement.recipientCount)})
                            </>
                        )}
                        {announcement.link && <> · opens {announcement.link}</>}
                    </p>
                </div>
            </div>
            {!retracted && (
                <Button variant="ghost" size="sm" onClick={() => setConfirming(true)} className="w-full shrink-0 sm:w-auto">
                    Take back
                </Button>
            )}
            {confirming && (
                <ConfirmPopup
                    title="Take this back?"
                    body={`“${announcement.title}” comes out of all ${formatCount(announcement.recipientCount)} inboxes, whether it has been read or not.`}
                    confirmLabel="Take it back"
                    isPending={retract.isPending}
                    onConfirm={() =>
                        retract.mutate(announcement.id, {
                            onSuccess: () => {
                                setConfirming(false);
                                notify("Taken out of every inbox", "success");
                            },
                            onError: () => notify("That didn’t go through", "error"),
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
            body: body.trim() || "The sentence everyone reads under it.",
            link: draft.link,
            isTest: false,
        }),
        [tone, title, body, draft.link]
    );

    const sendTest = () => {
        if (!parsed.success) return;
        test.mutate(parsed.data, {
            onSuccess: () => notify("In your bell, and nobody else’s", "success"),
            onError: () => notify("The test didn’t send", "error"),
        });
    };

    const sendAll = () => {
        if (!parsed.success) return;
        send.mutate(parsed.data, {
            onSuccess: (sent) => {
                setConfirming(false);
                setTitle("");
                setBody("");
                setLink("");
                notify(`In ${formatCount(sent.recipientCount)} inboxes`, "success");
            },
            onError: () => {
                setConfirming(false);
                notify("It didn’t send", "error");
            },
        });
    };

    const reach = overview?.totals.users;

    return (
        <>
            <AdminPageHeader
                title="Announcements"
                description="A message to every account, in the bell beside everything else. Only people here when it goes out receive it."
            />

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
                <section aria-labelledby="compose-heading" className={cardClass("flex flex-col gap-4")}>
                    <h2 id="compose-heading" className="text-label text-content-muted">
                        Write one
                    </h2>

                    <Field label="What it is">
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
                                    placeholder="Make a list of anything, and share it with your friends."
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

                    <div className="flex flex-col-reverse gap-2 border-t border-subtle pt-4 sm:flex-row sm:items-center sm:justify-end">
                        <Button
                            variant="ghost"
                            onClick={sendTest}
                            disabled={!parsed.success || test.isPending}
                            className="w-full sm:w-auto"
                        >
                            Send test to me
                        </Button>
                        <Button
                            onClick={() => setConfirming(true)}
                            disabled={!parsed.success || send.isPending}
                            className="w-full sm:w-auto"
                        >
                            {reach ? `Send to ${formatCount(reach)} people` : "Send to everyone"}
                        </Button>
                    </div>
                </section>

                <div className="flex flex-col gap-2.5 lg:sticky lg:top-24">
                    <h3 className="text-label text-content-muted">How it will look</h3>
                    {/* The bell's own surface, width and heading, so what fits
                        here fits there. */}
                    <div className={popoverClass("w-full max-w-[24rem] animate-none p-3", "menu")}>
                        <p className="font-display text-lg font-semibold text-content">Notifications</p>
                        <ul className="mt-3">
                            <NotificationItem notification={preview} onNavigate={() => undefined} preview />
                        </ul>
                    </div>
                    <p className="text-label-sm text-content-muted">
                        On a phone the bell is a sheet the width of the screen, so this is the narrowest it gets.
                    </p>
                </div>
            </div>

            <section className="mt-10">
                <SectionHeader
                    title="Sent"
                    note={history.data?.length ? `${history.data.length} so far` : undefined}
                />
                {history.isPending ? (
                    <TextSkeleton lines={4} />
                ) : !history.data?.length ? (
                    <EmptyNote>Nothing has gone out yet. Tests stay out of this list.</EmptyNote>
                ) : (
                    <ul className={cardClass("flex flex-col py-1")}>
                        {history.data.map((a) => (
                            <HistoryRow key={a.id} announcement={a} />
                        ))}
                    </ul>
                )}
            </section>

            {confirming && parsed.success && (
                <ConfirmPopup
                    title="Send to everyone?"
                    body={`“${parsed.data.title}” goes into ${reach ? `all ${formatCount(reach)}` : "every"} inboxes now. You can take it back later, but anyone who has read it will have seen it.`}
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

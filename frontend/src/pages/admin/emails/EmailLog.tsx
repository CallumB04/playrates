import { useState } from "react";
import {
    EMAIL_MESSAGE_GROUP_NAMES,
    type AdminEmailMessage,
    type EmailMessageGroup,
} from "@playrates/shared";
import { cardClass } from "../../../components/ui/cardClass";
import Chip from "../../../components/ui/Chip";
import EmptyPlate, { EmptyNote } from "../../../components/ui/EmptyPlate";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import LedgerRow, { LedgerList } from "../../../components/ui/LedgerRow";
import ProfilePicture from "../../../components/ProfilePicture";
import { plateClass } from "../../../components/ui/plateClass";
import { cn } from "../../../lib/cn";
import { relativeTime } from "../../../lib/format";
import { useAdminEmailMessages } from "../../../hooks/queries/useAdmin";
import SectionHeader from "../components/SectionHeader";
import ShowOlder from "../components/ShowOlder";
import { SeeAllButton, SeeAllModal } from "../components/SeeAll";
import { useSeeAll } from "../components/useSeeAll";
import { groupByDay, timeInDay } from "../lib/plot";
import { GROUP_LABELS, kindLabel, statusMark } from "./emailStatsView";

const at = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
    });

const Face = ({ email }: { email: AdminEmailMessage }) =>
    email.member ? (
        <span className="shrink-0 [&>*]:size-9">
            <ProfilePicture
                variant="nav"
                file={email.member.avatarUrl ?? ""}
                accent={email.member.accent}
                username={email.member.username}
                link={false}
            />
        </span>
    ) : (
        <span
            aria-hidden
            className="size-9 shrink-0 rounded-full border border-dashed border-strong"
        />
    );

const EmailRow = ({
    email,
    day,
}: {
    email: AdminEmailMessage;
    day: string;
}) => {
    const [open, setOpen] = useState(false);
    const mark = statusMark(email.status);

    return (
        <li>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className={cn(
                    "flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-2.5 text-left lift hover:bg-surface-hover",
                    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                    open && "bg-surface-hover"
                )}
            >
                <Face email={email} />
                <span className="min-w-0 flex-1">
                    <span className="block text-body-sm break-words text-content-secondary">
                        <span className="font-medium text-content">
                            {email.subject}
                        </span>{" "}
                        to {email.member?.username ?? email.to}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-label-sm text-content-muted">
                        <span className={mark.className}>{mark.label}</span>
                        <span>{kindLabel(email.kind)}</span>
                        <time dateTime={email.sentAt}>
                            {timeInDay(email.sentAt, day) ||
                                relativeTime(email.sentAt)}
                        </time>
                    </span>
                </span>
            </button>

            {open && (
                <div className="pb-2 pl-2 sm:pl-14">
                    <div
                        className={plateClass(
                            "pressed",
                            "shallow",
                            "px-3.5 py-3"
                        )}
                    >
                        <LedgerList>
                            <LedgerRow
                                label="To"
                                value={
                                    <span className="break-all">
                                        {email.to}
                                    </span>
                                }
                            />
                            <LedgerRow
                                label="What became of it"
                                value={
                                    <span className={mark.className}>
                                        {mark.label}
                                    </span>
                                }
                            />
                            {email.detail && (
                                <LedgerRow
                                    label="Why"
                                    value={
                                        <span className="break-words">
                                            {email.detail}
                                        </span>
                                    }
                                />
                            )}
                            <LedgerRow label="Sent" value={at(email.sentAt)} />
                            <LedgerRow
                                label="Last heard"
                                value={at(email.updatedAt)}
                            />
                            <LedgerRow
                                label="Recorded as"
                                value={email.kind}
                                rule={false}
                            />
                        </LedgerList>
                    </div>
                </div>
            )}
        </li>
    );
};

const Days = ({
    emails,
    compact = false,
}: {
    emails: AdminEmailMessage[];
    compact?: boolean;
}) => (
    <div
        className={
            compact
                ? undefined
                : cardClass("px-1.5 pt-1 pb-2 sm:px-2", { padding: "none" })
        }
    >
        {groupByDay(emails, (e) => e.sentAt).map((day) => (
            <section key={day.key}>
                <h3 className="px-2 pt-3.5 pb-1 text-label text-content-muted">
                    {day.label}
                </h3>
                <ul className="flex flex-col">
                    {day.items.map((email) => (
                        <EmailRow
                            key={email.id}
                            email={email}
                            day={day.label}
                        />
                    ))}
                </ul>
            </section>
        ))}
    </div>
);

/** Every email in the last 30 days, filterable, behind "See all". */
const FullLog = () => {
    const [group, setGroup] = useState<EmailMessageGroup | undefined>();
    const feed = useAdminEmailMessages({ group });
    const emails = feed.data?.pages.flatMap((page) => page.data) ?? [];

    return (
        <>
            <div className="mb-4 flex flex-wrap gap-2">
                <Chip selected={!group} onClick={() => setGroup(undefined)}>
                    Everything
                </Chip>
                {EMAIL_MESSAGE_GROUP_NAMES.map((name) => (
                    <Chip
                        key={name}
                        selected={group === name}
                        onClick={() => setGroup(name)}
                    >
                        {GROUP_LABELS[name]}
                    </Chip>
                ))}
            </div>
            {feed.isPending ? (
                <TextSkeleton lines={6} />
            ) : emails.length === 0 ? (
                <EmptyPlate title="Nothing of that kind in 30 days" />
            ) : (
                <div
                    className={cn(
                        "transition-opacity",
                        feed.isPlaceholderData && "opacity-60"
                    )}
                >
                    <Days emails={emails} />
                    <ShowOlder
                        hasMore={feed.hasNextPage}
                        loading={feed.isFetchingNextPage}
                        onClick={() => feed.fetchNextPage()}
                        end="Nothing older: the log keeps 30 days."
                    />
                </div>
            )}
        </>
    );
};

/** The last few emails and who they went to; the rest behind a popup. */
const EmailLog = () => {
    const feed = useAdminEmailMessages({}, 5);
    const emails = feed.data?.pages[0]?.data ?? [];
    const all = useSeeAll();

    return (
        <section aria-label="Who got what">
            <SectionHeader
                title="Who got what"
                trailing={
                    emails.length > 0 && <SeeAllButton onClick={all.show} />
                }
            />
            {feed.isPending ? (
                <TextSkeleton lines={5} />
            ) : emails.length === 0 ? (
                <EmptyNote>
                    Nothing in the last 30 days. Each email shows here with who
                    it went to and whether it arrived.
                </EmptyNote>
            ) : (
                <Days emails={emails} />
            )}
            {all.open && (
                <SeeAllModal
                    title="Every email, last 30 days"
                    onClose={all.hide}
                    wide
                >
                    <FullLog />
                </SeeAllModal>
            )}
        </section>
    );
};

/** One member's last few, inside their detail. */
export const MemberEmails = ({ userId }: { userId: string }) => {
    const feed = useAdminEmailMessages({ userId }, 5);
    const emails = feed.data?.pages[0]?.data ?? [];

    if (feed.isPending) return <TextSkeleton lines={3} />;
    if (emails.length === 0) {
        return <EmptyNote>None in the last 30 days.</EmptyNote>;
    }
    return <Days emails={emails} compact />;
};

export default EmailLog;

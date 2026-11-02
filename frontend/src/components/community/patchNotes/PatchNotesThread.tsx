import { useState } from "react";
import { Link } from "react-router-dom";
import { Megaphone, Plus } from "lucide-react";
import type {
    CommunityMessage,
    PatchNote,
    ThreadDetail,
} from "@playrates/shared";
import Button from "../../ui/Button";
import { cardClass } from "../../ui/cardClass";
import { EmptyNote } from "../../ui/EmptyPlate";
import { useAdminPatchNotes } from "../../../hooks/queries/useAdmin";
import { useOverflowFade } from "../../../hooks/useOverflowFade";
import { cn } from "../../../lib/cn";
import { formatDate } from "../../../lib/format";
import MessageItem, { type MessageActions } from "../MessageItem";
import PatchNoteNotify from "../PatchNoteNotify";
import PatchNoteEditor from "./PatchNoteEditor";
import { splitReleaseTitle } from "./releaseTitle";

export const OfficialBadge = () => (
    <span className="rounded-xs border border-accent/60 px-1.5 py-px text-stamp font-semibold tracking-wider text-accent-content uppercase">
        Official
    </span>
);

/** The newest release, said beside its version: a dot in the accent, as
 *  the release list marks it too. */
const LatestDot = () => (
    <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-accent" />
);

const LatestLabel = () => (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent-quiet px-2.5 py-1 text-label-sm font-medium text-accent-content">
        <LatestDot />
        Latest
    </span>
);

/** A release's heading: the version large, its name beside it, the date
 *  beneath, and Latest across from it on the newest. */
const ReleaseHeader = ({
    title,
    createdAt,
    latest,
}: {
    title: string;
    createdAt: string;
    latest: boolean;
}) => {
    const { version, name } = splitReleaseTitle(title);
    return (
        <header className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
                <h2 className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <span className="font-display text-title text-content tabular-nums">
                        {version ?? name}
                    </span>
                    {version && name && (
                        <span className="font-display text-section text-content-secondary">
                            {name}
                        </span>
                    )}
                </h2>
                <time
                    dateTime={createdAt}
                    className="text-label-sm text-content-muted"
                >
                    {formatDate(createdAt)}
                </time>
            </div>
            {latest && <LatestLabel />}
        </header>
    );
};

const hashOf = (entry: CommunityMessage) => `message-${entry.id}`;

/** Every release, to jump to: a rail beside them on a wide screen, a row
 *  above them on a narrower one. */
const ReleaseIndex = ({
    entries,
    current,
    latestId,
}: {
    entries: CommunityMessage[];
    current: number | null;
    latestId: number | undefined;
}) => {
    const fade = useOverflowFade<HTMLUListElement>();
    const titled = entries.filter((e) => e.patchNote);
    if (titled.length < 2) return null;

    return (
        <nav
            aria-label="Releases"
            className="min-w-0 lg:sticky lg:top-24 lg:self-start"
        >
            <h2 className="mb-2 hidden text-label text-content-muted lg:block">
                Releases
            </h2>
            <ul
                ref={fade.ref}
                onScroll={fade.onScroll}
                style={fade.style}
                className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0"
            >
                {titled.map((entry) => {
                    const { version, name } = splitReleaseTitle(
                        entry.patchNote!.title
                    );
                    const active = entry.id === current;
                    return (
                        <li key={entry.id} className="shrink-0">
                            <Link
                                to={{ hash: hashOf(entry) }}
                                aria-current={active ? "location" : undefined}
                                className={cn(
                                    "flex min-h-11 items-center gap-2 rounded-sm border px-3 text-label lift lg:min-h-0 lg:flex-col lg:items-start lg:gap-0 lg:border-transparent lg:px-2.5 lg:py-1.5",
                                    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                                    active
                                        ? "border-strong bg-surface-raised text-content"
                                        : "border-subtle text-content-secondary hover:bg-surface-hover hover:text-content"
                                )}
                            >
                                <span className="flex items-center gap-1.5 font-medium tabular-nums">
                                    {version ?? name}
                                    {entry.id === latestId && (
                                        <>
                                            <LatestDot />
                                            <span className="sr-only">
                                                (latest)
                                            </span>
                                        </>
                                    )}
                                </span>
                                <span className="hidden text-label-sm text-content-muted lg:block">
                                    {formatDate(entry.createdAt)}
                                </span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
};

/**
 * The official thread, as a changelog: newest release first, since that's
 * what anyone opening it came for, with every release to jump to. Nobody
 * replies; everyone can react.
 */
const PatchNotesThread = ({
    detail,
    viewerId,
    actions,
    landedOn,
    onPost,
}: {
    detail: ThreadDetail;
    viewerId: string | undefined;
    actions: MessageActions;
    /** The release a link landed on. */
    landedOn: number | null;
    onPost: (note: PatchNote) => Promise<unknown>;
}) => {
    const entries = [...detail.messages].reverse();
    const [writing, setWriting] = useState(false);
    // Only whoever can post here can tell everyone about it.
    const { data: sendable } = useAdminPatchNotes(detail.canPost);
    const noteFor = (messageId: number) =>
        sendable?.find((note) => note.messageId === messageId);

    return (
        <>
            <header className="relative overflow-hidden rounded-lg border border-accent/40 bg-accent-quiet p-4 sm:p-6">
                <div className="flex items-start gap-4">
                    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-content-on-solid">
                        <Megaphone size={22} aria-hidden />
                    </span>
                    <div className="min-w-0">
                        <OfficialBadge />
                        <h1 className="mt-2 font-display text-title text-content">
                            {detail.thread.title}
                        </h1>
                        <p className="mt-2 text-body-sm text-content-secondary">
                            What’s changed on the site, newest at the top.
                        </p>
                    </div>
                </div>
            </header>

            {/* Below the header rather than on it: the header is what
                every reader sees, the button only whoever writes them. */}
            {detail.canPost && !writing && (
                <Button
                    variant="secondary"
                    onClick={() => setWriting(true)}
                    className="w-full sm:w-auto sm:self-end"
                >
                    <Plus size={15} aria-hidden />
                    Write patch notes
                </Button>
            )}

            {writing && (
                <section className={cardClass("flex flex-col gap-3")}>
                    <h2 className="font-display text-base font-semibold text-content">
                        New patch notes
                    </h2>
                    <PatchNoteEditor
                        submitLabel="Publish"
                        onCancel={() => setWriting(false)}
                        onSubmit={async (note) => {
                            await onPost(note);
                            setWriting(false);
                        }}
                    />
                </section>
            )}

            {entries.length === 0 ? (
                <EmptyNote>No patch notes yet.</EmptyNote>
            ) : (
                <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[9.5rem_minmax(0,1fr)] lg:gap-8">
                    <ReleaseIndex
                        entries={entries}
                        current={landedOn}
                        latestId={entries[0]?.id}
                    />
                    <div className="flex min-w-0 flex-col gap-5">
                        {entries.map((entry, i) => {
                            const note = noteFor(entry.id);
                            return (
                                <MessageItem
                                    key={entry.id}
                                    message={entry}
                                    viewerId={viewerId}
                                    actions={actions}
                                    header={
                                        entry.patchNote ? (
                                            <ReleaseHeader
                                                title={entry.patchNote.title}
                                                createdAt={entry.createdAt}
                                                latest={i === 0}
                                            />
                                        ) : undefined
                                    }
                                    badge={<OfficialBadge />}
                                    extraActions={
                                        note && <PatchNoteNotify note={note} />
                                    }
                                    highlighted={landedOn === entry.id}
                                    showEdited={false}
                                    linkify
                                    className={cardClass(undefined, {
                                        tone: i === 0 ? "latest" : "default",
                                    })}
                                />
                            );
                        })}
                    </div>
                </div>
            )}
        </>
    );
};

export default PatchNotesThread;

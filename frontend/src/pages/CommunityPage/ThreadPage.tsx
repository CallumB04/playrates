import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Megaphone, Trash2 } from "lucide-react";
import type {
    CommunityMessage,
    RichTextDoc,
    ThreadDetail,
} from "@playrates/shared";
import { useAuth } from "../../contexts/AuthContext";
import { useAccountForm } from "../../contexts/AccountFormContext";
import { useNotify } from "../../contexts/NotificationContext";
import {
    useCommunityMutations,
    useThread,
} from "../../hooks/queries/useCommunity";
import { usePageTitle } from "../../hooks/usePageTitle";
import Button from "../../components/ui/Button";
import { cardClass } from "../../components/ui/Card";
import ConfirmPopup from "../../components/ui/ConfirmPopup";
import EmptyPlate, { EmptyNote } from "../../components/ui/EmptyPlate";
import { TextSkeleton } from "../../components/ui/Skeleton";
import GameCover from "../../components/game/GameCover";
import MessageItem, {
    type MessageActions,
} from "../../components/community/MessageItem";
import MessageComposer from "../../components/community/MessageComposer";
import { replyParentId } from "../../components/community/replyTarget";
import {
    formatCount,
    formatDate,
    formatMessageCount,
    relativeTime,
} from "../../lib/format";
import { cn } from "../../lib/cn";

type Pending =
    { kind: "message"; message: CommunityMessage } | { kind: "thread" };

interface ReplyTarget {
    parentId: number;
    to: string | null;
}

/** On the replies of whoever started the thread. Not on the opening
 *  message, where it would say the obvious. */
const OriginalAuthorBadge = () => (
    <span className="rounded-xs bg-brand-subtle px-1.5 py-px text-stamp font-semibold tracking-wider text-brand uppercase">
        Original author
    </span>
);

const OfficialBadge = () => (
    <span className="rounded-xs border border-accent/60 px-1.5 py-px text-stamp font-semibold tracking-wider text-accent-content uppercase">
        Official
    </span>
);

const ThreadPage = () => {
    const { threadId } = useParams();
    const id = Number(threadId);
    const navigate = useNavigate();
    const notify = useNotify();
    const { user } = useAuth();
    const { openLogin } = useAccountForm();
    const mutations = useCommunityMutations();

    const { data, isLoading, isError } = useThread(id);
    usePageTitle(data?.thread.title);

    const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
    const [pending, setPending] = useState<Pending | null>(null);
    const composerRef = useRef<HTMLDivElement>(null);

    /* A link to one message lands before the thread has loaded, so the
       browser has nothing to scroll to; this does it once it has. */
    const { hash } = useLocation();
    const [landedOn, setLandedOn] = useState<number | null>(null);
    useEffect(() => {
        const match = /^#message-(\d+)$/.exec(hash);
        if (!match || !data) return;
        const target = document.getElementById(`message-${match[1]}`);
        if (!target) return;
        target.scrollIntoView({ block: "center", behavior: "smooth" });
        setLandedOn(Number(match[1]));
    }, [hash, data]);

    if (isLoading) return <TextSkeleton lines={8} />;
    if (isError || !data) {
        return (
            <EmptyPlate
                title="Thread not found"
                body="It may have been removed, or the link is out of date."
                action={
                    <Link to="/community" className="text-brand">
                        Back to the community
                    </Link>
                }
            />
        );
    }

    const isPatchNotes = data.thread.subject.kind === "patch_notes";
    const creatorId = data.thread.author?.id;
    const badgeFor = (message: CommunityMessage) =>
        !message.isOpening && creatorId && message.author?.id === creatorId ? (
            <OriginalAuthorBadge />
        ) : undefined;

    const actions: MessageActions = {
        onVote: (message) =>
            user ? mutations.vote.mutate(message.id) : openLogin(),
        onReply: isPatchNotes
            ? undefined
            : (message) => {
                  if (!user) return openLogin();
                  const parentId = replyParentId(message);
                  if (parentId === null) {
                      setReplyTo(null);
                      composerRef.current?.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                      });
                      return;
                  }
                  setReplyTo({
                      parentId,
                      to: message.author?.username ?? null,
                  });
              },
        onSaveEdit: (message, body) =>
            mutations.edit.mutateAsync({ messageId: message.id, body }),
        onDelete: (message) => setPending({ kind: "message", message }),
    };

    const post = (body: RichTextDoc, parentId?: number) =>
        mutations.post.mutateAsync({
            threadId: id,
            input: { body, parentId: parentId ?? null },
        });

    const confirmDelete = async () => {
        if (!pending) return;
        try {
            if (pending.kind === "thread") {
                await mutations.removeThread.mutateAsync(id);
                notify("Thread deleted", "success");
                navigate("/community", { replace: true });
            } else {
                await mutations.remove.mutateAsync(pending.message.id);
            }
            setPending(null);
        } catch (error) {
            notify(
                error instanceof Error ? error.message : "That didn't delete",
                "error"
            );
        }
    };

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
            <Link
                to="/community"
                className="inline-flex min-h-11 w-max items-center gap-1.5 text-label text-content-muted hover:text-content sm:min-h-0"
            >
                <ArrowLeft size={14} aria-hidden />
                Community
            </Link>

            {isPatchNotes ? (
                <PatchNotesThread
                    detail={data}
                    viewerId={user?.id}
                    actions={actions}
                    onPost={(body) => post(body)}
                />
            ) : (
                <>
                    <ThreadHeader detail={data} />

                    {data.messages.map((message) =>
                        message.isOpening ? (
                            <MessageItem
                                key={message.id}
                                message={message}
                                highlighted={landedOn === message.id}
                                viewerId={user?.id}
                                actions={actions}
                                className={cardClass()}
                                extraActions={
                                    data.canDeleteThread && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="min-h-11 px-2.5 hover:text-danger sm:min-h-8"
                                            onClick={() =>
                                                setPending({ kind: "thread" })
                                            }
                                        >
                                            <Trash2 size={14} aria-hidden />
                                            Delete thread
                                        </Button>
                                    )
                                }
                            />
                        ) : null
                    )}

                    <section className="flex flex-col gap-3">
                        <h2 className="font-display text-section text-content">
                            {replyCount(data) === 0
                                ? "Replies"
                                : `${formatMessageCount(replyCount(data))} ${replyCount(data) === 1 ? "reply" : "replies"}`}
                        </h2>

                        {data.messages.length <= 1 ? (
                            <EmptyNote>No replies yet. Start it off.</EmptyNote>
                        ) : (
                            <div
                                className={cardClass(
                                    "flex flex-col divide-y divide-subtle",
                                    { padding: "none" }
                                )}
                            >
                                {data.messages
                                    .filter((m) => !m.isOpening)
                                    .map((message) => (
                                        <MessageItem
                                            key={message.id}
                                            message={message}
                                            highlighted={
                                                landedOn === message.id
                                            }
                                            badge={badgeFor(message)}
                                            viewerId={user?.id}
                                            actions={actions}
                                            className="p-4 sm:p-5"
                                        >
                                            {(message.replies.length > 0 ||
                                                replyTo?.parentId ===
                                                    message.id) && (
                                                <div className="mt-3 flex flex-col gap-4 border-l-2 border-subtle pl-3 sm:ml-4 sm:pl-5">
                                                    {message.replies.map(
                                                        (reply) => (
                                                            <MessageItem
                                                                key={reply.id}
                                                                message={reply}
                                                                highlighted={
                                                                    landedOn ===
                                                                    reply.id
                                                                }
                                                                badge={badgeFor(
                                                                    reply
                                                                )}
                                                                viewerId={
                                                                    user?.id
                                                                }
                                                                actions={
                                                                    actions
                                                                }
                                                            />
                                                        )
                                                    )}
                                                    {replyTo?.parentId ===
                                                        message.id && (
                                                        <MessageComposer
                                                            label="Your reply"
                                                            note={
                                                                replyTo.to
                                                                    ? `Replying to ${replyTo.to}`
                                                                    : undefined
                                                            }
                                                            submitLabel="Reply"
                                                            autoFocus
                                                            onCancel={() =>
                                                                setReplyTo(null)
                                                            }
                                                            onSubmit={async (
                                                                body
                                                            ) => {
                                                                await post(
                                                                    body,
                                                                    message.id
                                                                );
                                                                setReplyTo(
                                                                    null
                                                                );
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                            )}
                                        </MessageItem>
                                    ))}
                            </div>
                        )}
                    </section>

                    <div ref={composerRef} className={cardClass()}>
                        {user ? (
                            <MessageComposer
                                label="Add to the thread"
                                placeholder="Add to the thread…"
                                submitLabel="Post reply"
                                onSubmit={(body) => post(body)}
                            />
                        ) : (
                            <div className="flex flex-col items-center gap-3 py-2 text-center sm:flex-row sm:justify-between sm:text-left">
                                <p className="text-body-sm text-content-secondary">
                                    Log in to join the conversation.
                                </p>
                                <Button
                                    onClick={openLogin}
                                    className="w-full sm:w-auto"
                                >
                                    Log in to reply
                                </Button>
                            </div>
                        )}
                    </div>
                </>
            )}

            {pending && (
                <ConfirmPopup
                    title={
                        pending.kind === "thread"
                            ? "Delete this thread?"
                            : "Delete this message?"
                    }
                    body={
                        pending.kind === "thread"
                            ? "The thread and every message in it go for good."
                            : "It will show as deleted, so any replies to it still make sense."
                    }
                    confirmLabel="Delete"
                    isPending={
                        mutations.remove.isPending ||
                        mutations.removeThread.isPending
                    }
                    onConfirm={() => void confirmDelete()}
                    onClose={() => setPending(null)}
                />
            )}
        </div>
    );
};

const replyCount = (detail: ThreadDetail): number =>
    Math.max(0, detail.thread.messageCount - 1);

const ThreadHeader = ({ detail }: { detail: ThreadDetail }) => {
    const { thread } = detail;
    const game = thread.subject.kind === "game" ? thread.subject.game : null;

    return (
        <header className="flex flex-col gap-3">
            {game && (
                <Link
                    to={`/game/${game.id}`}
                    className="group inline-flex min-h-11 w-max max-w-full items-center gap-2.5 sm:min-h-0"
                >
                    <GameCover
                        coverUrl={game.coverUrl}
                        title={game.title}
                        className="aspect-3/4 w-8 shrink-0 overflow-hidden rounded-xs shadow-cover"
                    />
                    <span className="truncate text-label font-medium text-content-secondary group-hover:text-brand">
                        {game.title}
                    </span>
                </Link>
            )}
            <h1 className="font-display text-title text-content">
                {thread.title}
            </h1>
            <p className="text-label text-content-muted">
                Started {relativeTime(thread.createdAt)} by{" "}
                {thread.author ? (
                    <Link
                        to={`/user/${thread.author.username}`}
                        className="text-content-secondary hover:text-brand"
                    >
                        {thread.author.username}
                    </Link>
                ) : (
                    "a deleted account"
                )}{" "}
                · {formatCount(thread.contributorCount)}{" "}
                {thread.contributorCount === 1 ? "person" : "people"}
            </p>
        </header>
    );
};

/**
 * The official thread. Entries newest first, since the latest release is
 * what anyone opening it came for. Nobody replies; everyone can upvote.
 */
const PatchNotesThread = ({
    detail,
    viewerId,
    actions,
    onPost,
}: {
    detail: ThreadDetail;
    viewerId: string | undefined;
    actions: MessageActions;
    onPost: (body: RichTextDoc) => Promise<unknown>;
}) => {
    const entries = [...detail.messages].reverse();

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
                            Every release, written up by the PlayRates team.
                            Upvote the changes you’re glad of.
                        </p>
                    </div>
                </div>
            </header>

            {detail.canPost && (
                <section className={cardClass("flex flex-col gap-3")}>
                    <h2 className="font-display text-base font-semibold text-content">
                        Post patch notes
                    </h2>
                    <MessageComposer
                        label="New patch notes"
                        placeholder="Start with an H1 naming the release. It becomes the entry's title."
                        submitLabel="Publish"
                        onSubmit={onPost}
                    />
                </section>
            )}

            {entries.length === 0 ? (
                <EmptyNote>No patch notes yet.</EmptyNote>
            ) : (
                entries.map((entry) => (
                    <div key={entry.id} className="flex flex-col gap-2">
                        <p className="font-mono text-label-sm text-accent-content">
                            {formatDate(entry.createdAt)}
                        </p>
                        <MessageItem
                            message={entry}
                            viewerId={viewerId}
                            actions={actions}
                            badge={<OfficialBadge />}
                            className={cn(
                                cardClass(),
                                "border-l-4 border-l-accent"
                            )}
                        />
                    </div>
                ))
            )}
        </>
    );
};

export default ThreadPage;

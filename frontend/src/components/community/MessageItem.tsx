import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { MessageSquareReply, Pencil, Trash2, UserX } from "lucide-react";
import type { CommunityMessage, RichTextDoc } from "@playrates/shared";
import ProfilePicture from "../ProfilePicture";
import VoteButton from "../ui/VoteButton";
import Button from "../ui/Button";
import { whyCannotVote } from "../../lib/voting";
import { relativeTime } from "../../lib/format";
import { cn } from "../../lib/cn";
import RichTextView from "./RichTextView";
import MessageComposer from "./MessageComposer";

export interface MessageActions {
    onVote: (message: CommunityMessage) => void;
    onReply?: (message: CommunityMessage) => void;
    onSaveEdit: (
        message: CommunityMessage,
        body: RichTextDoc
    ) => Promise<unknown>;
    onDelete: (message: CommunityMessage) => void;
}

interface MessageItemProps {
    message: CommunityMessage;
    viewerId: string | undefined;
    actions: MessageActions;
    /** A label beside the author: "Official" on patch notes, say. */
    badge?: ReactNode;
    /** Extra controls in the action row, like deleting the whole thread. */
    extraActions?: ReactNode;
    /** The message a link landed on, lit so the eye finds it. */
    highlighted?: boolean;
    /** Off where a message is kept up to date on purpose, like patch notes. */
    showEdited?: boolean;
    className?: string;
    /** What comes beneath: the replies, or a composer answering this. */
    children?: ReactNode;
}

const ActionButton = ({
    onClick,
    icon,
    children,
    tone = "default",
}: {
    onClick: () => void;
    icon: ReactNode;
    children: ReactNode;
    tone?: "default" | "danger";
}) => (
    <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClick}
        className={cn(
            "min-h-11 px-2.5 sm:min-h-8",
            tone === "danger" && "hover:text-danger"
        )}
    >
        {icon}
        {children}
    </Button>
);

/**
 * One message with everything you can do to it laid out beside it. No menu
 * behind a hover: on a phone there is no hover to find it with.
 */
const MessageItem = ({
    message,
    viewerId,
    actions,
    badge,
    extraActions,
    highlighted = false,
    showEdited = true,
    className,
    children,
}: MessageItemProps) => {
    const [editing, setEditing] = useState(false);
    const author = message.author;

    if (message.deleted) {
        return (
            <div className={className}>
                <p className="rounded-md border border-dashed border-strong px-3 py-2.5 text-body-sm text-content-muted italic">
                    This message was deleted.
                </p>
                {children}
            </div>
        );
    }

    return (
        <article
            id={`message-${message.id}`}
            className={cn(
                "scroll-mt-24",
                highlighted &&
                    "rounded-xs outline-2 outline-offset-4 outline-brand/50",
                className
            )}
        >
            <header className="flex items-center gap-2.5">
                {author ? (
                    <ProfilePicture
                        variant="nav"
                        file={author.avatarUrl ?? ""}
                        username={author.username}
                        accent={author.accent}
                        link
                    />
                ) : (
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-sunken text-content-muted">
                        <UserX size={16} aria-hidden />
                    </span>
                )}
                <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    {author ? (
                        <Link
                            to={`/user/${author.username}`}
                            className="truncate text-body-sm font-semibold text-content hover:text-brand"
                        >
                            {author.username}
                        </Link>
                    ) : (
                        <span className="text-body-sm font-semibold text-content-muted">
                            Deleted account
                        </span>
                    )}
                    {badge}
                    <span className="text-label-sm text-content-muted">
                        {relativeTime(message.createdAt)}
                        {showEdited && message.editedAt && " · edited"}
                    </span>
                </span>
            </header>

            {editing && message.body ? (
                <div className="mt-3">
                    <MessageComposer
                        initial={message.body}
                        label="Edit your message"
                        submitLabel="Save"
                        autoFocus
                        onCancel={() => setEditing(false)}
                        onSubmit={async (body) => {
                            await actions.onSaveEdit(message, body);
                            setEditing(false);
                        }}
                    />
                </div>
            ) : (
                message.body && (
                    <RichTextView doc={message.body} className="mt-2.5" />
                )
            )}

            {!editing && (
                <div className="mt-2 -ml-1 flex flex-wrap items-center gap-1">
                    <VoteButton
                        count={message.voteCount}
                        voted={message.votedByViewer}
                        noun="message"
                        disabledReason={whyCannotVote(
                            viewerId,
                            author?.id,
                            "message"
                        )}
                        onToggle={() => actions.onVote(message)}
                        className="mr-1"
                    />
                    {actions.onReply && (
                        <ActionButton
                            onClick={() => actions.onReply?.(message)}
                            icon={<MessageSquareReply size={14} aria-hidden />}
                        >
                            Reply
                        </ActionButton>
                    )}
                    {message.canEdit && (
                        <ActionButton
                            onClick={() => setEditing(true)}
                            icon={<Pencil size={14} aria-hidden />}
                        >
                            Edit
                        </ActionButton>
                    )}
                    {message.canDelete && (
                        <ActionButton
                            tone="danger"
                            onClick={() => actions.onDelete(message)}
                            icon={<Trash2 size={14} aria-hidden />}
                        >
                            Delete
                        </ActionButton>
                    )}
                    {extraActions}
                </div>
            )}

            {children}
        </article>
    );
};

export default MessageItem;

import { useRef, useState, type ComponentType } from "react";
import { Link } from "react-router-dom";
import {
    ArrowBigUp,
    Bell,
    Heart,
    MessageSquareReply,
    MessagesSquare,
    PartyPopper,
    UserCheck,
    UserPlus,
    type LucideIcon,
} from "lucide-react";
import type {
    AnnouncementNotification,
    AppNotification,
    CommunityReplyNotification,
    CommunityThreadActivityNotification,
    CommunityUpvoteMilestoneNotification,
    ReviewUpvoteMilestoneNotification,
    ListUpvoteMilestoneNotification,
    Gaming25LoveMilestoneNotification,
    FriendAcceptedNotification,
    FriendRequestNotification,
    FriendUser,
    WelcomeNotification,
} from "@playrates/shared";
import Button from "../ui/Button";
import {
    BRAND_NAME,
    BRAND_PITCH,
    DISCORD_INVITE_URL,
} from "../../constants/brand";
import ProfilePicture from "../ProfilePicture";
import { useFriendRelation } from "../../hooks/queries/useFriends";
import { usePatchNotification } from "../../hooks/queries/useNotifications";
import GameCover from "../game/GameCover";
import { threadPath } from "../community/paths";
import { gaming25Path } from "../../lib/profilePaths";
import { formatCount, formatMessageCount } from "../../lib/format";
import { friendRequestState } from "./friendRequestState";
import IconMark from "./IconMark";
import AnnouncementBody from "./AnnouncementBody";
import ShowMoreToggle from "../ui/ShowMoreToggle";
import { useClamped } from "../../hooks/useClamped";
import { cn } from "../../lib/cn";
import { ANNOUNCEMENT_PRESENTATION } from "./announcementTones";

export interface ContentProps<T extends AppNotification> {
    notification: T;
    /** Rows link away, and the menu has to close behind them. */
    onNavigate: () => void;
}

interface Renderer<T extends AppNotification> {
    /** The mark, where the kind has nobody to show an avatar for. */
    icon: LucideIcon;
    tone: string;
    Content: ComponentType<ContentProps<T>>;
    /** Replaces the icon chip — an actor's face beats a glyph. */
    Leading?: ComponentType<{ notification: T }>;
}

const TITLE = "text-body-sm font-medium text-content";
const BODY = "mt-0.5 text-body-sm text-content-secondary";

/** The homepage's own pitch, so the first thing a new account reads here says
 *  what the front page said. */
const WelcomeContent = ({ onNavigate }: ContentProps<WelcomeNotification>) => (
    <>
        <p className={TITLE}>Welcome to {BRAND_NAME}</p>
        <p className={BODY}>
            {BRAND_PITCH.map((part) =>
                part.to ? (
                    <Link
                        key={part.text}
                        to={part.to}
                        onClick={onNavigate}
                        className="text-brand underline-offset-2 hover:underline"
                    >
                        {part.text}
                    </Link>
                ) : (
                    part.text
                )
            )}
        </p>
        <p className={BODY}>
            Come say hi on the{" "}
            <a
                href={DISCORD_INVITE_URL}
                target="_blank"
                rel="noreferrer noopener"
                onClick={onNavigate}
                className="text-brand underline-offset-2 hover:underline"
            >
                PlayRates Discord
            </a>
            .
        </p>
    </>
);

const FriendRequestContent = ({
    notification,
    onNavigate,
}: ContentProps<FriendRequestNotification>) => {
    const { actor, relation } = notification;
    const { accept, remove, isPending } = useFriendRelation(actor.id);
    const state = friendRequestState(relation);

    return (
        <>
            <p className={TITLE}>
                <ActorLink actor={actor} onNavigate={onNavigate} />{" "}
                <span className="font-normal text-content-secondary">
                    sent you a friend request
                </span>
            </p>

            {state.actionable ? (
                <div className="mt-2 flex gap-2">
                    <Button
                        onClick={() => accept.mutate()}
                        disabled={isPending}
                    >
                        Accept
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => remove.mutate()}
                        disabled={isPending}
                    >
                        Decline
                    </Button>
                </div>
            ) : (
                <p className={BODY}>{state.note}</p>
            )}
        </>
    );
};

const ActorLink = ({
    actor,
    onNavigate,
}: {
    actor: FriendUser;
    onNavigate: () => void;
}) => (
    <Link
        to={`/user/${actor.username}`}
        onClick={onNavigate}
        className="underline-offset-2 hover:underline"
    >
        {actor.username}
    </Link>
);

const FriendAcceptedContent = ({
    notification,
    onNavigate,
}: ContentProps<FriendAcceptedNotification>) => (
    <p className={TITLE}>
        <ActorLink actor={notification.actor} onNavigate={onNavigate} />{" "}
        <span className="font-normal text-content-secondary">
            accepted your friend request
        </span>
    </p>
);

/** Whoever the notification is about, where it is about someone. */
const ActorFace = ({
    notification,
}: {
    notification: { actor: FriendUser };
}) => (
    <ProfilePicture
        variant="friendRow"
        username={notification.actor.username}
        file={notification.actor.avatarUrl ?? ""}
        accent={notification.actor.accent}
        link={false}
    />
);

/** Opening a community notification is reading it. */
const useOpen = (notification: AppNotification, onNavigate: () => void) => {
    const patch = usePatchNotification();
    return () => {
        if (notification.readAt === null) {
            patch.mutate({ id: notification.id, patch: { read: true } });
        }
        onNavigate();
    };
};

const CommunityReplyContent = ({
    notification,
    onNavigate,
}: ContentProps<CommunityReplyNotification>) => {
    const open = useOpen(notification, onNavigate);
    return (
        <Link
            to={`${threadPath(notification.threadId)}#message-${notification.messageId}`}
            onClick={open}
            className="group block"
        >
            <p className={TITLE}>
                <span className="group-hover:underline">
                    {notification.actor.username}
                </span>{" "}
                <span className="font-normal text-content-secondary">
                    replied to you in
                </span>{" "}
                {notification.threadTitle}
            </p>
            {notification.excerpt && (
                <p className={`${BODY} line-clamp-2`}>
                    “{notification.excerpt}”
                </p>
            )}
        </Link>
    );
};

const CommunityActivityContent = ({
    notification,
    onNavigate,
}: ContentProps<CommunityThreadActivityNotification>) => {
    const open = useOpen(notification, onNavigate);
    const { count } = notification;
    return (
        <Link
            to={threadPath(notification.threadId)}
            onClick={open}
            className="group block"
        >
            <p className={TITLE}>
                <span className="group-hover:underline">
                    {formatMessageCount(count)} new{" "}
                    {count === 1 ? "message" : "messages"}
                </span>{" "}
                <span className="font-normal text-content-secondary">
                    in your thread
                </span>
            </p>
            <p className={`${BODY} line-clamp-2`}>{notification.threadTitle}</p>
        </Link>
    );
};

/** The tone picks the mark, so it cannot be the registry's one static icon. */
const AnnouncementMark = ({
    notification,
}: {
    notification: AnnouncementNotification;
}) => {
    const { icon, tone } = ANNOUNCEMENT_PRESENTATION[notification.tone];
    return <IconMark icon={icon} tone={tone} />;
};

const AnnouncementContent = ({
    notification,
    onNavigate,
}: ContentProps<AnnouncementNotification>) => {
    const open = useOpen(notification, onNavigate);
    const [expanded, setExpanded] = useState(false);
    const titleRef = useRef<HTMLParagraphElement>(null);
    const bodyRef = useRef<HTMLParagraphElement>(null);
    const titleClipped = useClamped(titleRef, notification.title);
    const bodyClipped = useClamped(bodyRef, notification.body);

    const title = (
        <span className="group-hover:underline">{notification.title}</span>
    );

    // The message can hold links of its own, and a link can't sit inside
    // another, so the title's link is stretched over the block instead.
    return (
        <div className="group relative">
            <p
                ref={titleRef}
                className={cn(
                    TITLE,
                    "break-words",
                    !expanded && "line-clamp-2"
                )}
            >
                {notification.isTest && (
                    <span className="mr-1.5 rounded-sm bg-surface-sunken px-1 py-px align-[1px] text-label-sm font-medium text-content-muted">
                        Test
                    </span>
                )}
                {notification.link ? (
                    <Link
                        to={notification.link}
                        onClick={open}
                        className="after:absolute after:inset-0 after:content-['']"
                    >
                        {title}
                    </Link>
                ) : (
                    notification.title
                )}
            </p>
            <p
                ref={bodyRef}
                className={cn(BODY, "break-words", !expanded && "line-clamp-3")}
            >
                <AnnouncementBody body={notification.body} onNavigate={open} />
            </p>
            {/* Nothing else holds the rest of an announcement, so a narrow
                bell has to be able to show all of it. */}
            {(titleClipped || bodyClipped || expanded) && (
                <ShowMoreToggle
                    open={expanded}
                    onToggle={() => setExpanded((v) => !v)}
                    className="relative z-10"
                />
            )}
        </div>
    );
};

const Upvotes = ({ count }: { count: number }) => (
    <span className="group-hover:underline">{formatCount(count)} upvotes</span>
);

const MessageMilestoneContent = ({
    notification,
    onNavigate,
}: ContentProps<CommunityUpvoteMilestoneNotification>) => {
    const open = useOpen(notification, onNavigate);
    return (
        <Link
            to={`${threadPath(notification.threadId)}#message-${notification.messageId}`}
            onClick={open}
            className="group block"
        >
            <p className={TITLE}>
                <Upvotes count={notification.milestone} />{" "}
                <span className="font-normal text-content-secondary">
                    on your message in
                </span>{" "}
                {notification.threadTitle}
            </p>
            {notification.excerpt && (
                <p className={`${BODY} line-clamp-2`}>
                    “{notification.excerpt}”
                </p>
            )}
        </Link>
    );
};

const ReviewMilestoneContent = ({
    notification,
    onNavigate,
}: ContentProps<ReviewUpvoteMilestoneNotification>) => {
    const open = useOpen(notification, onNavigate);
    return (
        <Link
            to={`/game/${notification.gameId}#review-${notification.reviewId}`}
            onClick={open}
            className="group block"
        >
            <p className={TITLE}>
                <Upvotes count={notification.milestone} />{" "}
                <span className="font-normal text-content-secondary">
                    on your review of
                </span>{" "}
                {notification.gameTitle}
            </p>
        </Link>
    );
};

const ListMilestoneContent = ({
    notification,
    onNavigate,
}: ContentProps<ListUpvoteMilestoneNotification>) => {
    const open = useOpen(notification, onNavigate);
    return (
        <Link
            to={`/user/${notification.username}/lists/${notification.listId}`}
            onClick={open}
            className="group block"
        >
            <p className={TITLE}>
                <Upvotes count={notification.milestone} />{" "}
                <span className="font-normal text-content-secondary">
                    on your list
                </span>{" "}
                {notification.listName}
            </p>
        </Link>
    );
};

const Gaming25MilestoneContent = ({
    notification,
    onNavigate,
}: ContentProps<Gaming25LoveMilestoneNotification>) => {
    const open = useOpen(notification, onNavigate);
    return (
        <Link
            to={gaming25Path(notification.username)}
            onClick={open}
            className="group block"
        >
            <p className={TITLE}>
                <span className="group-hover:underline">
                    {formatCount(notification.milestone)} loves
                </span>{" "}
                <span className="font-normal text-content-secondary">
                    on your
                </span>{" "}
                Gaming 25
            </p>
        </Link>
    );
};

/** The game it is about, where the row has no one to show. */
const CoverLeading = ({
    notification,
}: {
    notification: { coverUrl: string | null; gameTitle: string | null };
}) => (
    <GameCover
        coverUrl={notification.coverUrl}
        title={notification.gameTitle ?? ""}
        className="aspect-3/4 w-10 shrink-0 self-start overflow-hidden rounded-xs"
    />
);

const UnknownContent = () => (
    <>
        <p className={TITLE}>Something happened</p>
        <p className={BODY}>
            This one needs a newer version of the site to read properly.
        </p>
    </>
);

/**
 * One entry per kind. The mapped type is the point: adding a kind to the
 * shared union will not compile until it has a renderer here, so the menu can
 * never quietly grow a row it does not know how to draw.
 */
export const NOTIFICATION_RENDERERS: {
    [K in AppNotification["kind"]]: Renderer<
        Extract<AppNotification, { kind: K }>
    >;
} = {
    welcome: {
        icon: PartyPopper,
        tone: "text-brand",
        Content: WelcomeContent,
    },
    friend_request: {
        icon: UserPlus,
        tone: "text-brand",
        Content: FriendRequestContent,
        Leading: ActorFace,
    },
    friend_accepted: {
        icon: UserCheck,
        tone: "text-brand",
        Content: FriendAcceptedContent,
        Leading: ActorFace,
    },
    community_reply: {
        icon: MessageSquareReply,
        tone: "text-brand",
        Content: CommunityReplyContent,
        Leading: ActorFace,
    },
    community_thread_activity: {
        icon: MessagesSquare,
        tone: "text-brand",
        Content: CommunityActivityContent,
        Leading: CoverLeading,
    },
    community_upvote_milestone: {
        icon: ArrowBigUp,
        tone: "text-brand",
        Content: MessageMilestoneContent,
    },
    review_upvote_milestone: {
        icon: ArrowBigUp,
        tone: "text-brand",
        Content: ReviewMilestoneContent,
        Leading: CoverLeading,
    },
    list_upvote_milestone: {
        icon: ArrowBigUp,
        tone: "text-brand",
        Content: ListMilestoneContent,
    },
    gaming_25_love_milestone: {
        icon: Heart,
        tone: "text-love",
        Content: Gaming25MilestoneContent,
    },
    announcement: {
        icon: ANNOUNCEMENT_PRESENTATION.update.icon,
        tone: ANNOUNCEMENT_PRESENTATION.update.tone,
        Content: AnnouncementContent,
        Leading: AnnouncementMark,
    },
    unknown: {
        icon: Bell,
        tone: "text-content-muted",
        Content: UnknownContent,
    },
};

import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Gift, UserPlus } from "lucide-react";
import type {
    AnnouncementNotification,
    AppNotification,
    CommunityReplyNotification,
    CommunityThreadActivityNotification,
    CommunityUpvoteMilestoneNotification,
    ReviewUpvoteMilestoneNotification,
    ListUpvoteMilestoneNotification,
    Gaming25LoveMilestoneNotification,
    ReferralJoinedNotification,
    ReferralActiveNotification,
    StreakAtRiskNotification,
    TaskNearlyDoneNotification,
    GiftReceivedNotification,
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
import { useAuth } from "../../contexts/AuthContext";
import { giftPath, itemName } from "../shop/shopItems";
import { TokenCoin } from "../progress/TokenAmount";
import { questPath } from "../../lib/questPath";
import { useFriendRelation } from "../../hooks/queries/useFriends";
import { usePatchNotification } from "../../hooks/queries/useNotificationActions";
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
import type { ContentProps } from "./registry";

const TITLE = "text-body-sm font-medium text-content";
const BODY = "mt-0.5 text-body-sm text-content-secondary";

/** The homepage's own pitch, so the first thing a new account reads here says
 *  what the front page said. */
export const WelcomeContent = ({
    onNavigate,
}: ContentProps<WelcomeNotification>) => (
    <>
        <p className={TITLE}>Welcome to {BRAND_NAME}</p>
        <p className={BODY}>
            {BRAND_PITCH.map((part) =>
                part.to ? (
                    <Link
                        key={part.text}
                        to={part.to}
                        onClick={onNavigate}
                        className="text-brand-text underline-offset-2 hover:underline"
                    >
                        {part.text}
                    </Link>
                ) : (
                    part.text
                )
            )}
        </p>
        <p className={BODY}>
            Join the{" "}
            <a
                href={DISCORD_INVITE_URL}
                target="_blank"
                rel="noreferrer noopener"
                onClick={onNavigate}
                className="text-brand-text underline-offset-2 hover:underline"
            >
                PlayRates Discord
            </a>
            .
        </p>
    </>
);

export const FriendRequestContent = ({
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

export const FriendAcceptedContent = ({
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
export const ActorFace = ({
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

/** The sender's face, or the gift itself once their account is gone. */
export const GiftFace = ({
    notification,
}: {
    notification: GiftReceivedNotification;
}) =>
    notification.actor ? (
        <ActorFace notification={{ actor: notification.actor }} />
    ) : (
        <IconMark icon={Gift} tone="brand" />
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

export const CommunityReplyContent = ({
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

export const CommunityActivityContent = ({
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
export const AnnouncementMark = ({
    notification,
}: {
    notification: AnnouncementNotification;
}) => {
    const { icon, tone } = ANNOUNCEMENT_PRESENTATION[notification.tone];
    return <IconMark icon={icon} tone={tone} />;
};

export const AnnouncementContent = ({
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
    <span className="group-hover:underline">
        {formatCount(count)} reactions
    </span>
);

export const MessageMilestoneContent = ({
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

export const ReviewMilestoneContent = ({
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

export const ListMilestoneContent = ({
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
                <span className="group-hover:underline">
                    {formatCount(notification.milestone)} loves
                </span>{" "}
                <span className="font-normal text-content-secondary">
                    on your list
                </span>{" "}
                {notification.listName}
            </p>
        </Link>
    );
};

export const Gaming25MilestoneContent = ({
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

export const ReferralJoinedContent = ({
    notification,
    onNavigate,
}: ContentProps<ReferralJoinedNotification>) => {
    const open = useOpen(notification, onNavigate);
    return (
        <Link
            to={`/user/${notification.username}`}
            onClick={open}
            className="group block"
        >
            <p className={TITLE}>
                <span className="group-hover:underline">
                    {notification.username}
                </span>{" "}
                <span className="font-normal text-content-secondary">
                    joined from your invite
                </span>
            </p>
        </Link>
    );
};

export const GiftReceivedContent = ({
    notification,
    onNavigate,
}: ContentProps<GiftReceivedNotification>) => {
    const open = useOpen(notification, onNavigate);
    const { user } = useAuth();
    return (
        <Link
            to={user ? giftPath(notification.item, user.username) : "/shop"}
            onClick={open}
            className="group block"
        >
            <p className={TITLE}>
                <span className="group-hover:underline">
                    {notification.username}
                </span>{" "}
                <span className="font-normal text-content-secondary">
                    gifted you {itemName(notification.item)}
                </span>
            </p>
        </Link>
    );
};

/** The rest of the week or month, as a day: "ends Sunday". */
const WEEKDAY = new Intl.DateTimeFormat("en-GB", { weekday: "long" });

/** XP and tokens as the rest of the site says them, the coin for tokens. */
const Reward = ({ xp, tokens }: { xp: number; tokens: number }) => (
    <span className="inline-flex items-center gap-1 font-mono text-label-sm font-semibold text-content tabular-nums">
        +{formatCount(xp)} XP
        {tokens > 0 && (
            <>
                <span aria-hidden> · </span>+{formatCount(tokens)}
                <TokenCoin className="size-3.5" />
                <span className="sr-only">tokens</span>
            </>
        )}
    </span>
);

export const ReferralFace = ({
    notification,
}: {
    notification: ReferralActiveNotification;
}) =>
    notification.actor ? (
        <ActorFace notification={{ actor: notification.actor }} />
    ) : (
        <IconMark icon={UserPlus} tone="brand" />
    );

export const ReferralActiveContent = ({
    notification,
    onNavigate,
}: ContentProps<ReferralActiveNotification>) => {
    const open = useOpen(notification, onNavigate);
    return (
        <Link
            to={`/user/${notification.username}`}
            onClick={open}
            className="group block"
        >
            <p className={TITLE}>
                <span className="group-hover:underline">
                    {notification.username}
                </span>{" "}
                <span className="font-normal text-content-secondary">
                    got going from your invite
                </span>
            </p>
            <p className="mt-1">
                <Reward xp={notification.xp} tokens={notification.tokens} />
            </p>
        </Link>
    );
};

export const StreakAtRiskContent = ({
    notification,
    onNavigate,
}: ContentProps<StreakAtRiskNotification>) => {
    const open = useOpen(notification, onNavigate);
    const day = WEEKDAY.format(new Date(notification.endsAt));
    return (
        <Link to="/progress#streak" onClick={open} className="group block">
            <p className={TITLE}>
                <span className="group-hover:underline">
                    Your {formatCount(notification.weeks)} week streak
                </span>{" "}
                <span className="font-normal text-content-secondary">
                    needs something by {day}
                </span>
            </p>
            <p className={BODY}>
                {notification.shield
                    ? "If not, a shield will keep it going."
                    : "Log, rate, review or post anything to keep it."}
            </p>
        </Link>
    );
};

export const TaskNearlyDoneContent = ({
    notification,
    onNavigate,
}: ContentProps<TaskNearlyDoneNotification>) => {
    const open = useOpen(notification, onNavigate);
    const { user } = useAuth();
    const day = WEEKDAY.format(new Date(notification.endsAt));
    return (
        <Link
            to={
                (user && questPath(notification.quest, user.username)) ??
                "/progress"
            }
            onClick={open}
            className="group block"
        >
            <p className={TITLE}>
                <span className="font-normal text-content-secondary">
                    Nearly there:
                </span>{" "}
                <span className="group-hover:underline">
                    {notification.label}
                </span>
            </p>
            <p className={BODY}>
                {formatCount(notification.count)} of{" "}
                {formatCount(notification.target)}, ends {day}.
            </p>
            <p className="mt-1">
                <Reward xp={notification.xp} tokens={notification.tokens} />
            </p>
        </Link>
    );
};

/** The game it is about, where the row has no one to show. */
export const CoverLeading = ({
    notification,
}: {
    notification: { coverUrl: string | null; gameTitle: string | null };
}) => (
    <GameCover
        sizes="40px"
        coverUrl={notification.coverUrl}
        title={notification.gameTitle ?? ""}
        className="aspect-3/4 w-10 shrink-0 self-start overflow-hidden rounded-xs"
    />
);

export const UnknownContent = () => (
    <>
        <p className={TITLE}>New notification</p>
        <p className={BODY}>Refresh the page to see this one.</p>
    </>
);

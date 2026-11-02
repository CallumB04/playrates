import { type ComponentType } from "react";
import {
    ArrowBigUp,
    Bell,
    Flame,
    Gift,
    Heart,
    MessageSquareReply,
    ListChecks,
    MessagesSquare,
    PartyPopper,
    UserCheck,
    UserPlus,
    type LucideIcon,
} from "lucide-react";
import type { AppNotification } from "@playrates/shared";
import { ANNOUNCEMENT_PRESENTATION } from "./announcementTones";
import {
    ActorFace,
    AnnouncementContent,
    AnnouncementMark,
    CommunityActivityContent,
    CommunityReplyContent,
    CoverLeading,
    FriendAcceptedContent,
    FriendRequestContent,
    Gaming25MilestoneContent,
    GiftFace,
    GiftReceivedContent,
    ListMilestoneContent,
    MessageMilestoneContent,
    ReferralActiveContent,
    ReferralFace,
    ReferralJoinedContent,
    ReviewMilestoneContent,
    StreakAtRiskContent,
    TaskNearlyDoneContent,
    UnknownContent,
    WelcomeContent,
} from "./NotificationContents";

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
        tone: "text-brand-text",
        Content: WelcomeContent,
    },
    friend_request: {
        icon: UserPlus,
        tone: "text-brand-text",
        Content: FriendRequestContent,
        Leading: ActorFace,
    },
    friend_accepted: {
        icon: UserCheck,
        tone: "text-brand-text",
        Content: FriendAcceptedContent,
        Leading: ActorFace,
    },
    community_reply: {
        icon: MessageSquareReply,
        tone: "text-brand-text",
        Content: CommunityReplyContent,
        Leading: ActorFace,
    },
    community_thread_activity: {
        icon: MessagesSquare,
        tone: "text-brand-text",
        Content: CommunityActivityContent,
        Leading: CoverLeading,
    },
    community_upvote_milestone: {
        icon: ArrowBigUp,
        tone: "text-brand-text",
        Content: MessageMilestoneContent,
    },
    review_upvote_milestone: {
        icon: ArrowBigUp,
        tone: "text-brand-text",
        Content: ReviewMilestoneContent,
        Leading: CoverLeading,
    },
    list_upvote_milestone: {
        icon: Heart,
        tone: "text-love",
        Content: ListMilestoneContent,
    },
    gaming_25_love_milestone: {
        icon: Heart,
        tone: "text-love",
        Content: Gaming25MilestoneContent,
    },
    referral_joined: {
        icon: UserPlus,
        tone: "text-brand-text",
        Content: ReferralJoinedContent,
    },
    gift_received: {
        icon: Gift,
        tone: "text-brand-text",
        Content: GiftReceivedContent,
        Leading: GiftFace,
    },
    referral_active: {
        icon: UserPlus,
        tone: "text-brand-text",
        Content: ReferralActiveContent,
        Leading: ReferralFace,
    },
    streak_at_risk: {
        icon: Flame,
        tone: "text-accent",
        Content: StreakAtRiskContent,
    },
    task_nearly_done: {
        icon: ListChecks,
        tone: "text-brand-text",
        Content: TaskNearlyDoneContent,
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

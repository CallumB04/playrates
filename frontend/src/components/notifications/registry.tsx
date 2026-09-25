import type { ComponentType } from "react";
import { Link } from "react-router-dom";
import {
    Bell,
    PartyPopper,
    UserCheck,
    UserPlus,
    type LucideIcon,
} from "lucide-react";
import type {
    AppNotification,
    FriendAcceptedNotification,
    FriendRequestNotification,
    FriendUser,
    WelcomeNotification,
} from "@playrates/shared";
import Button from "../ui/Button";
import { BRAND_NAME, BRAND_PITCH } from "../../constants/brand";
import ProfilePicture from "../ProfilePicture";
import { useFriendRelation } from "../../hooks/queries/useFriends";
import { friendRequestState } from "./friendRequestState";

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
            {BRAND_PITCH.lead}{" "}
            <Link
                to="/community"
                onClick={onNavigate}
                className="text-brand underline-offset-2 hover:underline"
            >
                {BRAND_PITCH.community}
            </Link>
            {BRAND_PITCH.tail}
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
    unknown: {
        icon: Bell,
        tone: "text-content-muted",
        Content: UnknownContent,
    },
};

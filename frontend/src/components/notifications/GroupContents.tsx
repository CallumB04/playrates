import { Link } from "react-router-dom";
import type {
    AppNotification,
    CommunityReplyNotification,
    FriendAcceptedNotification,
    FriendUser,
} from "@playrates/shared";
import ProfilePicture from "../ProfilePicture";
import { usePatchNotification } from "../../hooks/queries/useNotificationActions";
import { threadPath } from "../community/paths";
import { namesOf } from "./notificationSections";
import { replyPhrase } from "./notificationSummary";

const TITLE = "text-body-sm font-medium text-content";
const BODY = "mt-0.5 text-body-sm text-content-secondary";

/** Several people at once: the latest two faces, overlapping. Each scales
 *  down towards its own corner, or both shrink into the middle as one. */
export const FacePair = ({ actors }: { actors: FriendUser[] }) => (
    <span className="relative flex size-10 shrink-0">
        {actors.slice(0, 2).map((actor, i) => (
            <span
                key={actor.id}
                className={
                    i === 0
                        ? "absolute top-0 left-0 z-10 origin-top-left scale-75 rounded-full ring-2 ring-surface-raised"
                        : "absolute right-0 bottom-0 origin-bottom-right scale-75 rounded-full"
                }
            >
                <ProfilePicture
                    variant="friendRow"
                    username={actor.username}
                    file={actor.avatarUrl ?? ""}
                    accent={actor.accent}
                    link={false}
                />
            </span>
        ))}
    </span>
);

/** Opening a group reads every row in it. */
const useOpenAll = (items: AppNotification[], onNavigate: () => void) => {
    const patch = usePatchNotification();
    return () => {
        for (const n of items) {
            if (n.readAt === null) {
                patch.mutate({ id: n.id, patch: { read: true } });
            }
        }
        onNavigate();
    };
};

export const AcceptedGroupContent = ({
    items,
    onNavigate,
}: {
    items: FriendAcceptedNotification[];
    onNavigate: () => void;
}) => {
    const open = useOpenAll(items, onNavigate);
    return (
        <Link to="/me/friends" onClick={open} className="group block">
            <p className={TITLE}>
                <span className="group-hover:underline">
                    {namesOf(items.map((n) => n.actor.username))}
                </span>{" "}
                <span className="font-normal text-content-secondary">
                    accepted your friend requests
                </span>
            </p>
        </Link>
    );
};

export const ReplyGroupContent = ({
    items,
    onNavigate,
}: {
    items: CommunityReplyNotification[];
    onNavigate: () => void;
}) => {
    const open = useOpenAll(items, onNavigate);
    const latest = items[0]!;
    // Each name once, however many times they replied.
    const names = [...new Set(items.map((n) => n.actor.username))];
    return (
        <Link
            to={`${threadPath(latest.threadId)}#message-${latest.messageId}`}
            onClick={open}
            className="group block"
        >
            <p className={TITLE}>
                <span className="group-hover:underline">{namesOf(names)}</span>{" "}
                <span className="font-normal text-content-secondary">
                    {replyPhrase(latest.reason)}
                </span>{" "}
                {latest.threadTitle}
            </p>
            {latest.excerpt && (
                <p className={`${BODY} line-clamp-2`}>“{latest.excerpt}”</p>
            )}
        </Link>
    );
};

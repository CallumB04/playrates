import { Link } from "react-router-dom";
import type { FriendActivity } from "@playrates/shared";
import ProfilePicture from "../../../components/ProfilePicture";
import Panel from "../../../components/ui/Panel";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import GameCover from "../../../components/game/GameCover";
import {
    STATUS_PRESENTATION,
    displayStatusFor,
    isDisplayStatus,
    type GameStatus,
    type PlayedStatus,
} from "../../../constants/gameStatus";
import { formatRating, relativeTime } from "../../../lib/format";
import { cn } from "../../../lib/cn";

/** What the actor did, as a sentence rather than a status word. */
const VERB: Record<string, string> = {
    played: "logged",
    playing: "started",
    backlog: "added to their backlog",
    wishlist: "wishlisted",
    finished: "finished",
    mastered: "mastered",
    shelved: "shelved",
    retired: "gave up on",
};

const Row = ({ item }: { item: FriendActivity }) => {
    const display = displayStatusFor(
        item.status as GameStatus,
        item.playedStatus as PlayedStatus | null
    );
    const presentation = isDisplayStatus(display)
        ? STATUS_PRESENTATION[display]
        : null;
    const Icon = presentation?.icon;

    return (
        <Link
            to={`/game/${item.game.id}`}
            className="lift flex items-center gap-3 rounded-md px-2 py-2 hover:bg-surface-hover"
        >
            <GameCover
                coverUrl={item.game.coverUrl}
                title={item.game.title}
                className="aspect-3/4 w-9 shrink-0 overflow-hidden rounded-xs shadow-cover"
            />

            <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-body-sm text-content-secondary">
                    <ProfilePicture
                        variant="nav"
                        file={item.actor.avatarUrl ?? ""}
                        username={item.actor.username}
                        link={false}
                    />
                    <span className="truncate">
                        <span className="font-medium text-content">
                            {item.actor.username}
                        </span>{" "}
                        {VERB[display] ?? "logged"}{" "}
                        <span className="font-medium text-content">
                            {item.game.title}
                        </span>
                    </span>
                </span>
                <span className="mt-1 flex items-center gap-2 pl-[calc(2.25rem+0.375rem)] text-label-sm text-content-muted">
                    {Icon && presentation && (
                        <span
                            className={cn(
                                "inline-flex items-center gap-1",
                                presentation.markTone
                            )}
                        >
                            <Icon size={11} aria-hidden />
                            {presentation.label}
                        </span>
                    )}
                    {item.hoursPlayed !== null && (
                        <span className="font-mono">{item.hoursPlayed}h</span>
                    )}
                    <span>{relativeTime(item.at)}</span>
                </span>
            </span>

            {item.rating !== null && (
                <span className="shrink-0 font-mono text-figure-sm text-brand">
                    {formatRating(item.rating)}
                </span>
            )}
        </Link>
    );
};

/**
 * The only part of the home page that changes because someone else did
 * something. It is deliberately a list of sentences rather than a grid of
 * covers, so it reads as people rather than as more library.
 */
const FriendFeed = ({
    items,
    isLoading,
    username,
}: {
    items: FriendActivity[];
    isLoading: boolean;
    /** Friends live on your profile now, not on a page of their own. */
    username: string;
}) => (
    <Panel
        title="Friend activity"
        trailing={
            <Link
                to={`/user/${username}`}
                className="text-label text-content-muted hover:text-brand"
            >
                All friends
            </Link>
        }
        bodyClassName="flex flex-col gap-0.5 p-2"
    >
        {isLoading ? (
            <TextSkeleton lines={4} />
        ) : items.length === 0 ? (
            <p className="px-2 py-6 text-center text-body-sm text-content-muted">
                Nothing yet. Add a few friends and their logs show up here.
            </p>
        ) : (
            items.map((item) => <Row key={item.logId} item={item} />)
        )}
    </Panel>
);

export default FriendFeed;

import type { FriendRelation } from "@playrates/shared";
import Button from "../../../components/ui/Button";
import { cn } from "../../../lib/cn";
import { relativeTime } from "../../../lib/format";

interface FriendActionProps {
    relation: FriendRelation | null;
    /** When the edge was created, for the "they asked you 2 days ago" line. */
    since: string | undefined;
    isPending: boolean;
    onAdd: () => void;
    onAccept: () => void;
    onRemove: () => void;
    /** Taking back a request you sent. A different confirmation to unfriending. */
    onCancel: () => void;
}

/** All three friend states in one place. */
const FriendAction = ({
    relation,
    since,
    isPending,
    onAdd,
    onAccept,
    onRemove,
    onCancel,
}: FriendActionProps) => {
    const note = (text: string) => (
        <span className="block text-right text-label-sm text-content-muted">
            {text}
        </span>
    );

    if (relation === "friend") {
        return (
            <div
                className={cn("flex flex-col gap-2", isPending && "opacity-60")}
            >
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={onRemove}
                    disabled={isPending}
                >
                    Friends
                </Button>
                {since && note(`Since ${new Date(since).getFullYear()}`)}
            </div>
        );
    }

    if (relation === "request-received") {
        return (
            <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                    <Button size="sm" onClick={onAccept} disabled={isPending}>
                        Accept
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onRemove}
                        disabled={isPending}
                    >
                        Decline
                    </Button>
                </div>
                {since && note(`They asked you · ${relativeTime(since)}`)}
            </div>
        );
    }

    if (relation === "request-sent") {
        return (
            <div className="flex flex-col gap-2">
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={onCancel}
                    disabled={isPending}
                >
                    Request sent
                </Button>
                {since && note(`Sent ${relativeTime(since)}`)}
            </div>
        );
    }

    return (
        <Button size="sm" onClick={onAdd} disabled={isPending}>
            Add friend
        </Button>
    );
};

export default FriendAction;

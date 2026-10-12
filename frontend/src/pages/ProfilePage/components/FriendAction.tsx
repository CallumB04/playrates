import type { FriendRelation } from "@playrates/shared";
import Button from "../../../components/ui/Button";
import { cn } from "../../../lib/cn";

interface FriendActionProps {
    relation: FriendRelation | null;
    isPending: boolean;
    onAdd: () => void;
    onAccept: () => void;
    onRemove: () => void;
    /** Taking back a request you sent. A different confirmation to unfriending. */
    onCancel: () => void;
}

/* 44px on a phone like the report button beside it, which also left the
   two different heights in one row. */
const TAP = "max-sm:min-h-11";

/* One width for Add friend, Request sent and Friends, so pressing one does
   not slide the report button beside it. */
const STEADY = cn(TAP, "min-w-28");

/** All three friend states in one place. */
const FriendAction = ({
    relation,
    isPending,
    onAdd,
    onAccept,
    onRemove,
    onCancel,
}: FriendActionProps) => {
    if (relation === "friend") {
        return (
            <Button
                variant="secondary"
                size="sm"
                className={cn(STEADY, isPending && "opacity-60")}
                onClick={onRemove}
                disabled={isPending}
            >
                Friends
            </Button>
        );
    }

    if (relation === "request-received") {
        return (
            <div className="flex gap-2">
                <Button
                    size="sm"
                    className={TAP}
                    onClick={onAccept}
                    disabled={isPending}
                >
                    Accept
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className={TAP}
                    onClick={onRemove}
                    disabled={isPending}
                >
                    Decline
                </Button>
            </div>
        );
    }

    if (relation === "request-sent") {
        return (
            <Button
                variant="secondary"
                size="sm"
                className={STEADY}
                onClick={onCancel}
                disabled={isPending}
            >
                Request sent
            </Button>
        );
    }

    return (
        <Button
            size="sm"
            className={STEADY}
            onClick={onAdd}
            disabled={isPending}
        >
            Add friend
        </Button>
    );
};

export default FriendAction;

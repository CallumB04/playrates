import { X } from "lucide-react";
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

/* One width for every state, Accept and Decline together included, so
   pressing any of them moves nothing: not the report button beside it, and
   on a phone not the whole row, which drops under the avatar when wider. */
const WIDTH = "w-30";
const STEADY = cn(TAP, WIDTH);

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
            <div className={cn("flex gap-2", WIDTH)}>
                <Button
                    size="sm"
                    className={cn(TAP, "flex-1 px-0")}
                    onClick={onAccept}
                    disabled={isPending}
                >
                    Accept
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    aria-label="Decline"
                    title="Decline"
                    className="size-9 px-0 max-sm:size-11"
                    onClick={onRemove}
                    disabled={isPending}
                >
                    <X size={15} aria-hidden />
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

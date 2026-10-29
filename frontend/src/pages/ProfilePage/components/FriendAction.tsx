import type { FriendRelation } from "@playrates/shared";
import Button from "../../../components/ui/Button";
import { cn } from "../../../lib/cn";

interface FriendActionProps {
    relation: FriendRelation | null;
    isPending: boolean;
    onAdd: () => void;
    onRemove: () => void;
    /** Taking back a request you sent. A different confirmation to unfriending. */
    onCancel: () => void;
    className?: string;
}

/* 44px on a phone like the report button beside it, which also left the
   two different heights in one row. */
const TAP = "max-sm:min-h-11";

/** Add, cancel or unfriend. */
const FriendAction = ({
    relation,
    isPending,
    onAdd,
    onRemove,
    onCancel,
    className,
}: FriendActionProps) => {
    if (relation === "friend") {
        return (
            <Button
                variant="secondary"
                size="sm"
                className={cn(TAP, className, isPending && "opacity-60")}
                onClick={onRemove}
                disabled={isPending}
            >
                Friends
            </Button>
        );
    }

    // Answered in the band under the bio instead.
    if (relation === "request-received") return null;

    if (relation === "request-sent") {
        return (
            <Button
                variant="secondary"
                size="sm"
                className={cn(TAP, className)}
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
            className={cn(TAP, className)}
            onClick={onAdd}
            disabled={isPending}
        >
            Add friend
        </Button>
    );
};

export default FriendAction;

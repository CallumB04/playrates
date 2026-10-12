import { Check, X } from "lucide-react";
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

/* Both words do not fit beside the avatar on a phone: the row dropped
   under it, and jumped back up once the request was answered. */
const ICON_ON_PHONE = "max-sm:size-11 max-sm:px-0";

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
                className={cn(TAP, isPending && "opacity-60")}
                onClick={onRemove}
                disabled={isPending}
            >
                Friends
            </Button>
        );
    }

    if (relation === "request-received") {
        return (
            <>
                <Button
                    size="sm"
                    className={ICON_ON_PHONE}
                    onClick={onAccept}
                    disabled={isPending}
                >
                    <Check size={16} aria-hidden className="sm:hidden" />
                    <span className="max-sm:sr-only">Accept</span>
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className={ICON_ON_PHONE}
                    onClick={onRemove}
                    disabled={isPending}
                >
                    <X size={16} aria-hidden className="sm:hidden" />
                    <span className="max-sm:sr-only">Decline</span>
                </Button>
            </>
        );
    }

    if (relation === "request-sent") {
        return (
            <Button
                variant="secondary"
                size="sm"
                className={TAP}
                onClick={onCancel}
                disabled={isPending}
            >
                Request sent
            </Button>
        );
    }

    return (
        <Button size="sm" className={TAP} onClick={onAdd} disabled={isPending}>
            Add friend
        </Button>
    );
};

export default FriendAction;

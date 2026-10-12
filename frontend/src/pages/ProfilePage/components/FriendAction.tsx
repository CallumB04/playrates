import { useId, useState } from "react";
import type { FriendRelation } from "@playrates/shared";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import { cn } from "../../../lib/cn";

interface FriendActionProps {
    relation: FriendRelation | null;
    /** Whose profile this is, for the phone's respond sheet. */
    username: string;
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

/** All three friend states in one place. */
const FriendAction = ({
    relation,
    username,
    isPending,
    onAdd,
    onAccept,
    onRemove,
    onCancel,
}: FriendActionProps) => {
    const [responding, setResponding] = useState(false);
    const sheetTitleId = useId();

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
        const respond = (answer: () => void) => () => {
            setResponding(false);
            answer();
        };

        return (
            <>
                <div className="flex gap-2 max-sm:hidden">
                    <Button size="sm" onClick={onAccept} disabled={isPending}>
                        Accept
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onRemove}
                        disabled={isPending}
                    >
                        Decline
                    </Button>
                </div>

                {/* Both words do not fit beside the avatar on a phone; the
                    row would drop under it and jump back up on answering. */}
                <Button
                    size="sm"
                    className={cn(TAP, "sm:hidden")}
                    onClick={() => setResponding(true)}
                    disabled={isPending}
                >
                    Respond
                </Button>

                {responding && (
                    <Modal
                        onClose={() => setResponding(false)}
                        labelledBy={sheetTitleId}
                        className="w-full max-w-sm"
                    >
                        <h2
                            id={sheetTitleId}
                            className="pr-10 font-display text-section text-content"
                        >
                            {username} sent you a friend request
                        </h2>
                        <div className="mt-4 flex flex-col gap-2">
                            <Button
                                size="touch"
                                className="w-full"
                                onClick={respond(onAccept)}
                            >
                                Accept
                            </Button>
                            <Button
                                variant="secondary"
                                size="touch"
                                className="w-full"
                                onClick={respond(onRemove)}
                            >
                                Decline
                            </Button>
                        </div>
                    </Modal>
                )}
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

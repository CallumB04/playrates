import { useMemo } from "react";
import type { FriendEdge } from "@playrates/shared";
import Modal from "../../../components/ui/Modal";
import Button from "../../../components/ui/Button";
import FriendProfile from "../../../components/FriendProfile";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import { useFriendRelation } from "../../../hooks/queries/useFriends";
import { formatCount, relativeTime } from "../../../lib/format";
import { cn } from "../../../lib/cn";

interface FriendsPopupProps {
    edges: FriendEdge[];
    isLoading: boolean;
    /** Requests can only be answered on your own profile. */
    canRespond: boolean;
    onClose: () => void;
}

/* Two lines, not one: at popup width a name, a timestamp and two buttons on
   one row truncate the only part that identifies who is asking. */
const RequestRow = ({ edge }: { edge: FriendEdge }) => {
    const { accept, remove, isPending } = useFriendRelation(edge.user.id);

    return (
        <div className="flex flex-col gap-1 rounded-sm py-1">
            <FriendProfile user={edge.user} density="compact" />
            <div className="flex items-center justify-between gap-3 pl-2">
                <span className="text-label-sm text-content-muted">
                    {relativeTime(edge.createdAt)}
                </span>
                <div className="flex shrink-0 gap-2">
                    <Button
                        size="sm"
                        onClick={() => accept.mutate()}
                        disabled={isPending}
                    >
                        Accept
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => remove.mutate()}
                        disabled={isPending}
                    >
                        Decline
                    </Button>
                </div>
            </div>
        </div>
    );
};

const Group = ({
    title,
    count,
    accent = false,
    children,
}: {
    title: string;
    count: number;
    accent?: boolean;
    children: React.ReactNode;
}) => (
    <section>
        <h3
            className={cn(
                "mb-1.5 flex items-baseline gap-2 text-label",
                accent ? "text-brand" : "text-content-muted"
            )}
        >
            {title}
            <span className="font-mono">{formatCount(count)}</span>
        </h3>
        <div className="flex flex-col gap-0.5">{children}</div>
    </section>
);

/**
 * Everything the friends panel could not fit, plus the requests.
 *
 * This is where the Friends page went. Accepting and declining happen here
 * rather than on a destination of their own, because answering a request is a
 * thing you do in passing, not somewhere you navigate to.
 */
const FriendsPopup = ({
    edges,
    isLoading,
    canRespond,
    onClose,
}: FriendsPopupProps) => {
    const { accepted, received, sent } = useMemo(
        () => ({
            accepted: edges.filter((e) => e.status === "friend"),
            received: edges.filter((e) => e.status === "request-received"),
            sent: edges.filter((e) => e.status === "request-sent"),
        }),
        [edges]
    );

    return (
        <Modal
            onClose={onClose}
            labelledBy="friends-popup-title"
            className="w-full max-w-lg"
        >
            <h2
                id="friends-popup-title"
                className="border-b border-subtle pb-3 font-display text-section text-content"
            >
                Friends
            </h2>

            <div className="flex max-h-[62vh] flex-col gap-5 overflow-y-auto pt-4">
                {isLoading ? (
                    <TextSkeleton lines={6} />
                ) : (
                    <>
                        {canRespond && received.length > 0 && (
                            <Group
                                title="Waiting on you"
                                count={received.length}
                                accent
                            >
                                {received.map((edge) => (
                                    <RequestRow
                                        key={edge.user.id}
                                        edge={edge}
                                    />
                                ))}
                            </Group>
                        )}

                        <Group title="Friends" count={accepted.length}>
                            {accepted.length === 0 ? (
                                <p className="px-2 py-1 text-body-sm text-content-muted">
                                    Nobody yet.
                                </p>
                            ) : (
                                accepted.map((edge) => (
                                    <FriendProfile
                                        key={edge.user.id}
                                        user={edge.user}
                                        density="compact"
                                        closePopup={onClose}
                                        trailing={`Since ${new Date(
                                            edge.createdAt
                                        ).getFullYear()}`}
                                    />
                                ))
                            )}
                        </Group>

                        {canRespond && sent.length > 0 && (
                            <Group title="You asked them" count={sent.length}>
                                {sent.map((edge) => (
                                    <FriendProfile
                                        key={edge.user.id}
                                        user={edge.user}
                                        density="compact"
                                        closePopup={onClose}
                                        trailing={relativeTime(edge.createdAt)}
                                    />
                                ))}
                            </Group>
                        )}
                    </>
                )}
            </div>
        </Modal>
    );
};

export default FriendsPopup;

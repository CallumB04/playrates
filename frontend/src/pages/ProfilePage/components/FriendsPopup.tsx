import { useMemo, useState } from "react";
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

type View = "friends" | "requests";

/* Two lines, not one: at popup width a name, a timestamp and two buttons on
   one row truncate the only part that identifies who is asking. */
const RequestRow = ({
    edge,
    incoming,
}: {
    edge: FriendEdge;
    incoming: boolean;
}) => {
    const { accept, remove, isPending } = useFriendRelation(edge.user.id);

    return (
        <div className="flex flex-col gap-1 rounded-sm py-1">
            <FriendProfile user={edge.user} density="compact" />
            <div className="flex items-center justify-between gap-3 pl-2">
                <span className="text-label-sm text-content-muted">
                    {incoming ? "Asked" : "Sent"} {relativeTime(edge.createdAt)}
                </span>
                <div className="flex shrink-0 gap-2">
                    {incoming ? (
                        <>
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
                        </>
                    ) : (
                        /* Nothing to accept on a request you sent; the only
                           action is taking it back. */
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => remove.mutate()}
                            disabled={isPending}
                        >
                            Cancel
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

const Section = ({
    title,
    count,
    children,
}: {
    title: string;
    count: number;
    children: React.ReactNode;
}) => (
    <section>
        <h3 className="mb-1.5 flex items-baseline gap-2 text-label text-content-muted">
            {title}
            <span className="font-mono">{formatCount(count)}</span>
        </h3>
        <div className="flex flex-col gap-0.5">{children}</div>
    </section>
);

/**
 * Friends, and the requests around them.
 *
 * Two views rather than three stacked lists: answering a request and browsing
 * a friend list are different errands, and putting them on one scroll meant
 * the thing needing an answer sat above a list that does not. Sent and
 * received stay apart inside the requests view, because only one of them has
 * anything to accept.
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

    const pending = received.length + sent.length;

    // Open on whichever view has something waiting.
    const [view, setView] = useState<View>(
        canRespond && received.length > 0 ? "requests" : "friends"
    );

    const TABS: { key: View; label: string; count: number }[] = [
        { key: "friends", label: "Friends", count: accepted.length },
        { key: "requests", label: "Requests", count: pending },
    ];

    return (
        <Modal
            onClose={onClose}
            labelledBy="friends-popup-title"
            className="w-full max-w-lg"
        >
            <h2
                id="friends-popup-title"
                className="font-display text-section text-content"
            >
                Friends
            </h2>

            {canRespond && (
                <div
                    role="tablist"
                    aria-label="Friends and requests"
                    className="mt-3 inline-flex gap-1 rounded-md border border-subtle bg-surface-sunken p-1"
                >
                    {TABS.map((tab) => (
                        <button
                            key={tab.key}
                            role="tab"
                            aria-selected={view === tab.key}
                            onClick={() => setView(tab.key)}
                            className={cn(
                                "lift flex cursor-pointer items-center gap-2 rounded-sm px-3.5 py-1.5 text-body-sm",
                                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                                view === tab.key
                                    ? "bg-surface-raised font-medium text-content shadow-lip"
                                    : "text-content-secondary hover:text-content"
                            )}
                        >
                            {tab.label}
                            <span
                                className={cn(
                                    "rounded-full px-1.5 font-mono text-label-sm tabular-nums",
                                    tab.key === "requests" &&
                                        received.length > 0
                                        ? "bg-brand text-content-on-solid"
                                        : "text-content-muted"
                                )}
                            >
                                {formatCount(tab.count)}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            <div className="mt-4 flex max-h-[62vh] flex-col gap-5 overflow-y-auto">
                {isLoading ? (
                    <TextSkeleton lines={6} />
                ) : view === "friends" || !canRespond ? (
                    <div className="flex flex-col gap-0.5">
                        {accepted.length === 0 ? (
                            <p className="px-2 py-6 text-center text-body-sm text-content-muted">
                                No friends yet.
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
                    </div>
                ) : pending === 0 ? (
                    <p className="px-2 py-6 text-center text-body-sm text-content-muted">
                        No requests waiting.
                    </p>
                ) : (
                    <>
                        {received.length > 0 && (
                            <Section
                                title="Waiting on you"
                                count={received.length}
                            >
                                {received.map((edge) => (
                                    <RequestRow
                                        key={edge.user.id}
                                        edge={edge}
                                        incoming
                                    />
                                ))}
                            </Section>
                        )}

                        {sent.length > 0 && (
                            <Section title="You asked them" count={sent.length}>
                                {sent.map((edge) => (
                                    <RequestRow
                                        key={edge.user.id}
                                        edge={edge}
                                        incoming={false}
                                    />
                                ))}
                            </Section>
                        )}
                    </>
                )}
            </div>
        </Modal>
    );
};

export default FriendsPopup;

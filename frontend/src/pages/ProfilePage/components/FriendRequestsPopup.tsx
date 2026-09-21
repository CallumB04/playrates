import type { ReactNode } from "react";
import type { FriendEdge } from "@playrates/shared";
import Modal from "../../../components/ui/Modal";
import Button from "../../../components/ui/Button";
import FriendProfile from "../../../components/FriendProfile";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import { useFriendRelation } from "../../../hooks/queries/useFriends";
import { formatCount } from "../../../lib/format";

interface FriendRequestsPopupProps {
    edges: FriendEdge[];
    isLoading: boolean;
    onClose: () => void;
}

const ReceivedRow = ({ edge }: { edge: FriendEdge }) => {
    const { accept, remove, isPending } = useFriendRelation(edge.user.id);

    return (
        <FriendProfile
            user={edge.user}
            density="compact"
            actions={
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
            }
        />
    );
};

// Nothing to accept on a request you sent, so the only action is taking it back.
const SentRow = ({ edge }: { edge: FriendEdge }) => {
    const { remove, isPending } = useFriendRelation(edge.user.id);

    return (
        <FriendProfile
            user={edge.user}
            density="compact"
            actions={
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => remove.mutate()}
                    disabled={isPending}
                >
                    Cancel
                </Button>
            }
        />
    );
};

const Section = ({
    title,
    count,
    children,
}: {
    title: string;
    count: number;
    children: ReactNode;
}) => (
    <section>
        <h3 className="mb-1.5 flex items-baseline gap-2 text-label text-content-muted">
            {title}
            <span className="font-mono">{formatCount(count)}</span>
        </h3>
        <div className="flex flex-col gap-0.5">{children}</div>
    </section>
);

/** Requests in both directions, kept apart because only one side can be accepted. */
const FriendRequestsPopup = ({
    edges,
    isLoading,
    onClose,
}: FriendRequestsPopupProps) => {
    const received = edges.filter((e) => e.status === "request-received");
    const sent = edges.filter((e) => e.status === "request-sent");

    return (
        <Modal
            onClose={onClose}
            labelledBy="friend-requests-title"
            className="w-full max-w-lg"
        >
            <h2
                id="friend-requests-title"
                className="font-display text-section text-content"
            >
                Friend requests
            </h2>

            <div className="mt-4 flex max-h-[62vh] flex-col gap-5 overflow-y-auto">
                {isLoading ? (
                    <TextSkeleton lines={4} />
                ) : received.length === 0 && sent.length === 0 ? (
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
                                    <ReceivedRow
                                        key={edge.user.id}
                                        edge={edge}
                                    />
                                ))}
                            </Section>
                        )}

                        {sent.length > 0 && (
                            <Section title="You asked them" count={sent.length}>
                                {sent.map((edge) => (
                                    <SentRow key={edge.user.id} edge={edge} />
                                ))}
                            </Section>
                        )}
                    </>
                )}
            </div>
        </Modal>
    );
};

export default FriendRequestsPopup;

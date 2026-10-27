import type { ReactNode } from "react";
import type { FriendEdge } from "@playrates/shared";
import Panel, { PanelCount } from "../../../components/ui/Panel";
import Button from "../../../components/ui/Button";
import FriendProfile from "../../../components/FriendProfile";
import { useFriendRelation } from "../../../hooks/queries/useFriends";
import { formatCount } from "../../../lib/format";

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
                        className="max-sm:min-h-11"
                    >
                        Accept
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => remove.mutate()}
                        disabled={isPending}
                        className="max-sm:min-h-11"
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
                    className="max-sm:min-h-11"
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
        <h3 className="mb-1.5 flex items-baseline gap-2 px-2 text-label text-content-muted">
            {title}
            <span className="font-mono">{formatCount(count)}</span>
        </h3>
        <div className="flex flex-col gap-0.5">{children}</div>
    </section>
);

/** Requests in both directions, kept apart because only one side can be
 *  accepted. Nothing at all when there are none. */
const FriendRequests = ({ edges }: { edges: FriendEdge[] }) => {
    const received = edges.filter((e) => e.status === "request-received");
    const sent = edges.filter((e) => e.status === "request-sent");
    if (received.length === 0 && sent.length === 0) return null;

    return (
        <Panel
            title="Friend requests"
            accent={received.length > 0}
            trailing={
                received.length > 0 && (
                    <PanelCount value={formatCount(received.length)} accent />
                )
            }
            bodyClassName="flex flex-col gap-4 p-2 pt-3"
        >
            {received.length > 0 && (
                <Section title="Waiting on you" count={received.length}>
                    {received.map((edge) => (
                        <ReceivedRow key={edge.user.id} edge={edge} />
                    ))}
                </Section>
            )}
            {sent.length > 0 && (
                <Section title="Sent" count={sent.length}>
                    {sent.map((edge) => (
                        <SentRow key={edge.user.id} edge={edge} />
                    ))}
                </Section>
            )}
        </Panel>
    );
};

export default FriendRequests;

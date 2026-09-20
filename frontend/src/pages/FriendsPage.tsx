import { useMemo } from "react";
import type { FriendEdge } from "@playrates/shared";
import { useAuth } from "../contexts/AuthContext";
import { useMyFriends, useFriendRelation } from "../hooks/queries/useFriends";
import { useAccountForm } from "../contexts/AccountFormContext";
import FriendProfile from "../components/FriendProfile";
import Button from "../components/ui/Button";
import EmptyPlate from "../components/ui/EmptyPlate";
import Panel, { PanelCount } from "../components/ui/Panel";
import { TextSkeleton } from "../components/ui/Skeleton";
import { cn } from "../lib/cn";
import { formatCount, relativeTime } from "../lib/format";

/** The shared panel, plus the two-column body a long friend list wants. */
const Section = ({
    title,
    count,
    accent = false,
    columns = false,
    children,
}: {
    title: string;
    count: number;
    accent?: boolean;
    columns?: boolean;
    children: React.ReactNode;
}) => (
    <Panel
        title={title}
        accent={accent}
        trailing={<PanelCount value={formatCount(count)} accent={accent} />}
        bodyClassName={cn(
            "p-2",
            columns ? "grid gap-0.5 sm:grid-cols-2" : "flex flex-col gap-0.5"
        )}
    >
        {children}
    </Panel>
);

const RequestRow = ({ edge }: { edge: FriendEdge }) => {
    const { accept, remove, isPending } = useFriendRelation(edge.user.id);

    /* Two lines, not one. The aside is narrow enough that a name, a
       timestamp and two buttons on one row truncate the only part that
       identifies who is asking. */
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

/**
 * Friends is a place, not a modal. The nav treats it as a destination, and a
 * pending request is the kind of thing you go looking for.
 *
 * Your friends hold the main column because that list is the one that grows;
 * requests sit alongside it, where an empty aside costs nothing.
 */
const FriendsPage = () => {
    const { user } = useAuth();
    const { openLogin } = useAccountForm();
    const { data: friends, isLoading } = useMyFriends();

    const { accepted, received, sent } = useMemo(() => {
        const edges = friends ?? [];
        return {
            accepted: edges.filter((e) => e.status === "friend"),
            received: edges.filter((e) => e.status === "request-received"),
            sent: edges.filter((e) => e.status === "request-sent"),
        };
    }, [friends]);

    if (!user) {
        return (
            <EmptyPlate
                eyebrow="Members only"
                title="Sign in to see your friends"
                body="Friendships are per-account, so there is nothing to show until you are signed in."
                action={<Button onClick={openLogin}>Sign in</Button>}
            />
        );
    }

    const pending = received.length > 0 || sent.length > 0;

    return (
        <section className="flex flex-col gap-7">
            <header>
                <h1 className="font-display text-title text-content">Friends</h1>
                <p className="mt-2 text-body-sm text-content-muted">
                    {formatCount(accepted.length)}{" "}
                    {accepted.length === 1 ? "friend" : "friends"}
                    {received.length > 0 && (
                        <>
                            {" · "}
                            <span className="text-brand">
                                {formatCount(received.length)} awaiting you
                            </span>
                        </>
                    )}
                </p>
            </header>

            {isLoading ? (
                <TextSkeleton lines={5} />
            ) : (
                <div
                    className={cn(
                        "grid items-start gap-6",
                        pending && "lg:grid-cols-[1fr_22rem]"
                    )}
                >
                    <Section
                        title="Your friends"
                        count={accepted.length}
                        columns={accepted.length > 3}
                    >
                        {accepted.length === 0 ? (
                            <EmptyPlate
                                eyebrow="Solo for now"
                                title="No friends yet"
                                body="Open someone's profile and send a request — a library is more interesting next to someone else's."
                            />
                        ) : (
                            accepted.map((edge) => (
                                <FriendProfile
                                    key={edge.user.id}
                                    user={edge.user}
                                    density="comfortable"
                                    trailing={`Since ${new Date(
                                        edge.createdAt
                                    ).getFullYear()}`}
                                />
                            ))
                        )}
                    </Section>

                    {pending && (
                        <div className="flex flex-col gap-6">
                            {received.length > 0 && (
                                <Section
                                    title="They asked you"
                                    count={received.length}
                                    accent
                                >
                                    {received.map((edge) => (
                                        <RequestRow
                                            key={edge.user.id}
                                            edge={edge}
                                        />
                                    ))}
                                </Section>
                            )}

                            {sent.length > 0 && (
                                <Section
                                    title="You asked them"
                                    count={sent.length}
                                >
                                    {sent.map((edge) => (
                                        <FriendProfile
                                            key={edge.user.id}
                                            user={edge.user}
                                            density="compact"
                                            trailing={relativeTime(
                                                edge.createdAt
                                            )}
                                        />
                                    ))}
                                </Section>
                            )}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
};

export default FriendsPage;

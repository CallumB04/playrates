import { useMemo } from "react";
import type { FriendEdge } from "@playrates/shared";
import { useAuth } from "../contexts/AuthContext";
import { useMyFriends, useFriendRelation } from "../hooks/queries/useFriends";
import { useAccountForm } from "../contexts/AccountFormContext";
import FriendProfile from "../components/FriendProfile";
import Button from "../components/ui/Button";
import EmptyPlate from "../components/ui/EmptyPlate";
import { TextSkeleton } from "../components/ui/Skeleton";
import { formatCount, relativeTime } from "../lib/format";

const Section = ({
    title,
    count,
    children,
}: {
    title: string;
    count: number;
    children: React.ReactNode;
}) => (
    <section className="flex flex-col gap-2">
        <header className="flex items-baseline justify-between border-b border-strong pb-2">
            <h2 className="font-display text-section text-content">{title}</h2>
            <span className="font-mono text-label uppercase text-content-muted">
                {formatCount(count)}
            </span>
        </header>
        {children}
    </section>
);

const RequestRow = ({ edge }: { edge: FriendEdge }) => {
    const { accept, remove, isPending } = useFriendRelation(edge.user.id);

    return (
        <div className="flex items-center gap-3 border-b border-subtle py-1.5">
            <div className="min-w-0 flex-1">
                <FriendProfile user={edge.user} density="compact" />
            </div>
            <span className="hidden font-mono text-label-sm uppercase text-content-muted sm:block">
                {relativeTime(edge.createdAt)}
            </span>
            <div className="flex shrink-0 gap-2">
                <Button size="sm" onClick={() => accept.mutate()} disabled={isPending}>
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
    );
};

/**
 * Friends is a place, not a modal. The nav treats it as a destination, and a
 * pending request is the kind of thing you go looking for.
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

    return (
        <section className="flex flex-col gap-8">
            <header>
                <h1 className="font-display text-title text-content">Friends</h1>
                <p className="mt-2 font-mono text-label uppercase text-content-muted">
                    {formatCount(accepted.length)} friends
                    {received.length > 0 &&
                        ` · ${formatCount(received.length)} awaiting you`}
                </p>
            </header>

            {isLoading ? (
                <TextSkeleton lines={5} />
            ) : (
                <div className="grid gap-8 lg:grid-cols-2">
                    <div className="flex flex-col gap-8">
                        {received.length > 0 && (
                            <Section title="They asked you" count={received.length}>
                                {received.map((edge) => (
                                    <RequestRow key={edge.user.id} edge={edge} />
                                ))}
                            </Section>
                        )}

                        <Section title="Your friends" count={accepted.length}>
                            {accepted.length === 0 ? (
                                <EmptyPlate
                                    eyebrow="Nobody yet"
                                    title="No friends on file"
                                    body="Open someone's profile and send a request — a shelf is more interesting next to someone else's."
                                />
                            ) : (
                                accepted.map((edge) => (
                                    <div
                                        key={edge.user.id}
                                        className="border-b border-subtle"
                                    >
                                        <FriendProfile
                                            user={edge.user}
                                            density="comfortable"
                                            trailing={`Since ${new Date(
                                                edge.createdAt
                                            ).getFullYear()}`}
                                        />
                                    </div>
                                ))
                            )}
                        </Section>
                    </div>

                    {sent.length > 0 && (
                        <Section title="You asked them" count={sent.length}>
                            {sent.map((edge) => (
                                <div
                                    key={edge.user.id}
                                    className="border-b border-subtle"
                                >
                                    <FriendProfile
                                        user={edge.user}
                                        density="compact"
                                        trailing={relativeTime(edge.createdAt)}
                                    />
                                </div>
                            ))}
                        </Section>
                    )}
                </div>
            )}
        </section>
    );
};

export default FriendsPage;

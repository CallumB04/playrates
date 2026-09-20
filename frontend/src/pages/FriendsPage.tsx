import { useMemo } from "react";
import type { FriendEdge } from "@playrates/shared";
import { useAuth } from "../contexts/AuthContext";
import { useMyFriends, useFriendRelation } from "../hooks/queries/useFriends";
import { useAccountForm } from "../contexts/AccountFormContext";
import FriendProfile from "../components/FriendProfile";
import Button from "../components/ui/Button";
import EmptyPlate from "../components/ui/EmptyPlate";
import { TextSkeleton } from "../components/ui/Skeleton";
import { cn } from "../lib/cn";
import { formatCount, relativeTime } from "../lib/format";

/**
 * A card with a header strip, rather than a heading over a run of underlined
 * rows. `accent` is for the one section that wants something from you.
 */
const Section = ({
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
    <section
        className={cn(
            "overflow-hidden rounded-lg border bg-surface-raised shadow-plate",
            accent ? "border-brand/30" : "border-subtle"
        )}
    >
        <header
            className={cn(
                "flex items-baseline justify-between gap-3 border-b px-4 py-3",
                accent
                    ? "border-brand/20 bg-brand-subtle"
                    : "border-subtle bg-surface-sunken/40"
            )}
        >
            <h2
                className={cn(
                    "font-display text-section",
                    accent ? "text-brand" : "text-content"
                )}
            >
                {title}
            </h2>
            <span
                className={cn(
                    "rounded-full px-2 py-0.5 font-mono text-label-sm tabular-nums",
                    accent
                        ? "bg-brand/15 text-brand"
                        : "bg-surface-sunken text-content-muted"
                )}
            >
                {formatCount(count)}
            </span>
        </header>
        <div className="flex flex-col gap-0.5 p-2">{children}</div>
    </section>
);

const RequestRow = ({ edge }: { edge: FriendEdge }) => {
    const { accept, remove, isPending } = useFriendRelation(edge.user.id);

    return (
        <div className="flex flex-wrap items-center gap-2 rounded-sm px-1 py-1 sm:flex-nowrap sm:gap-3">
            <div className="min-w-0 flex-1">
                <FriendProfile user={edge.user} density="compact" />
            </div>
            <span className="hidden shrink-0 font-mono text-label-sm text-content-muted lg:block">
                {relativeTime(edge.createdAt)}
            </span>
            <div className="flex shrink-0 gap-2 pl-2">
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
                    <Section title="Your friends" count={accepted.length}>
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

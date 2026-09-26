import { useId } from "react";
import { Link } from "react-router-dom";
import Modal from "../../../components/ui/Modal";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import ProfilePicture from "../../../components/ProfilePicture";
import PresenceDot from "../../../components/ui/PresenceDot";
import { buttonClass } from "../../../components/ui/Button";
import { formatCount, formatDate, relativeTime } from "../../../lib/format";
import { useAdminUser } from "../../../hooks/queries/useAdmin";
import ActivityFeed from "../activity/ActivityFeed";

const Fact = ({ label, value }: { label: string; value: string }) => (
    <div className="rounded-md border border-subtle bg-surface-sunken/40 px-3 py-2">
        <dt className="text-label-sm text-content-muted">{label}</dt>
        <dd className="font-mono text-figure-sm text-content tabular-nums">{value}</dd>
    </div>
);

/** One person: their figures, and their own slice of the activity log. */
const UserModal = ({ userId, onClose }: { userId: string; onClose: () => void }) => {
    const titleId = useId();
    const { data: user, isPending } = useAdminUser(userId);

    return (
        <Modal onClose={onClose} labelledBy={titleId} className="w-full sm:max-w-2xl">
            {isPending || !user ? (
                <TextSkeleton lines={6} />
            ) : (
                <div className="flex flex-col gap-5">
                    <header className="flex items-center gap-3 pr-10">
                        <span className="relative">
                            <ProfilePicture
                                variant="friendRowLarge"
                                file={user.avatarUrl ?? ""}
                                accent={user.accent}
                                username={user.username}
                                link={false}
                            />
                            {user.online && <PresenceDot online />}
                        </span>
                        <div className="min-w-0">
                            <h2 id={titleId} className="truncate text-section font-semibold text-content">
                                {user.username}
                                {user.isAdmin && (
                                    <span className="ml-2 rounded-sm bg-brand-subtle px-1.5 align-middle text-label-sm text-brand">
                                        Admin
                                    </span>
                                )}
                            </h2>
                            <p className="text-body-sm text-content-secondary">
                                Joined {formatDate(user.createdAt)} · seen{" "}
                                {user.online ? "now" : relativeTime(user.lastSeenAt)}
                            </p>
                        </div>
                    </header>

                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <Fact label="Game logs" value={formatCount(user.logCount)} />
                        <Fact label="Reviews" value={formatCount(user.reviewCount)} />
                        <Fact label="Replies" value={formatCount(user.messageCount)} />
                        <Fact label="Friends" value={formatCount(user.friendCount)} />
                        <Fact label="Days active" value={formatCount(user.activeDayCount)} />
                        <Fact
                            label="Welcome"
                            value={user.onboardedAt ? "Done" : "Not yet"}
                        />
                    </dl>

                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Link
                            to={`/user/${user.username}`}
                            className={buttonClass("secondary", "w-full sm:w-auto")}
                        >
                            Open profile
                        </Link>
                        <Link
                            to={`/admin/activity?user=${user.id}`}
                            className={buttonClass("secondary", "w-full sm:w-auto")}
                        >
                            Full activity
                        </Link>
                    </div>

                    <section className="flex flex-col gap-2">
                        <h3 className="text-label font-medium text-content-secondary">
                            Recent activity
                        </h3>
                        <ActivityFeed filters={{ userId: user.id }} />
                    </section>
                </div>
            )}
        </Modal>
    );
};

export default UserModal;

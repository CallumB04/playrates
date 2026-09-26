import { useId } from "react";
import { Link } from "react-router-dom";
import Modal from "../../../components/ui/Modal";
import Stat from "../../../components/ui/Stat";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import ProfilePicture from "../../../components/ProfilePicture";
import PresenceDot from "../../../components/ui/PresenceDot";
import { buttonClass } from "../../../components/ui/Button";
import { formatCount, formatMonthYear, relativeTime } from "../../../lib/format";
import { useAdminUser } from "../../../hooks/queries/useAdmin";
import ActivityFeed from "../activity/ActivityFeed";

/** One person, laid out as their profile header is, over their own slice of
 *  the activity log. */
const UserModal = ({ userId, onClose }: { userId: string; onClose: () => void }) => {
    const titleId = useId();
    const { data: user, isPending } = useAdminUser(userId);

    return (
        <Modal onClose={onClose} labelledBy={titleId} className="w-full sm:max-w-2xl">
            {isPending || !user ? (
                <TextSkeleton lines={6} />
            ) : (
                <div className="flex flex-col gap-6">
                    <header className="flex items-center gap-4 pr-10">
                        <span className="relative shrink-0">
                            <ProfilePicture variant="review" file={user.avatarUrl ?? ""} accent={user.accent} username={user.username} link={false} />
                            <PresenceDot online={user.online} size="lg" />
                        </span>
                        <div className="min-w-0">
                            <h2 id={titleId} className="truncate font-display text-section text-content">
                                {user.username}
                            </h2>
                            <p className="mt-1 text-label text-content-muted">
                                {user.online ? "Here now" : `Seen ${relativeTime(user.lastSeenAt)}`} · member since{" "}
                                {formatMonthYear(user.createdAt)}
                                {!user.onboardedAt && " · hasn’t finished the welcome"}
                            </p>
                        </div>
                    </header>

                    <div className="grid grid-cols-3 gap-x-6 gap-y-4 border-t border-subtle pt-4 sm:grid-cols-5">
                        <Stat label="Logs" value={formatCount(user.logCount)} />
                        <Stat label="Reviews" value={formatCount(user.reviewCount)} />
                        <Stat label="Replies" value={formatCount(user.messageCount)} />
                        <Stat label="Friends" value={formatCount(user.friendCount)} />
                        <Stat label="Days here" value={formatCount(user.activeDayCount)} />
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Link to={`/user/${user.username}`} className={buttonClass("secondary", "w-full sm:w-auto")}>
                            Open their profile
                        </Link>
                        <Link to={`/admin/activity?user=${user.id}`} className={buttonClass("ghost", "w-full sm:w-auto")}>
                            All their activity
                        </Link>
                    </div>

                    <section>
                        <h3 className="border-b border-subtle pb-2 text-label text-content-muted">Lately</h3>
                        <ActivityFeed filters={{ userId: user.id }} compact />
                    </section>
                </div>
            )}
        </Modal>
    );
};

export default UserModal;

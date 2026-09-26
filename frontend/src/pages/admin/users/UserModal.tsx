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
import Heatmap from "../components/Heatmap";
import { bucketLabel } from "../lib/adminFormat";
import { fillDays } from "../lib/plot";

const DAY_MS = 86_400_000;

/** One person, as their profile header has them, with the days they came and
 *  the last few things they did. */
const UserModal = ({ userId, onClose }: { userId: string; onClose: () => void }) => {
    const titleId = useId();
    const { data: user, isPending } = useAdminUser(userId);

    const today = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 83 * DAY_MS).toISOString().slice(0, 10);
    const days = user ? fillDays(from, today, new Set(user.activeDays)) : [];

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
                                {user.online ? "Here now" : `Last here ${relativeTime(user.lastSeenAt)}`} · joined{" "}
                                {formatMonthYear(user.createdAt)}
                                {!user.onboardedAt && " · hasn’t finished the welcome"}
                            </p>
                        </div>
                    </header>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-subtle pt-4 sm:grid-cols-4">
                        <Stat label="Games logged" value={formatCount(user.logCount)} />
                        <Stat label="Reviews written" value={formatCount(user.reviewCount)} />
                        <Stat label="Community replies" value={formatCount(user.messageCount)} />
                        <Stat label="Friends" value={formatCount(user.friendCount)} />
                    </div>

                    <section>
                        <h3 className="mb-3 flex items-baseline justify-between gap-3 border-b border-subtle pb-2 text-label text-content-muted">
                            Days they used PlayRates · last 12 weeks
                            <span>
                                <span className="font-mono text-content">{formatCount(user.activeDayCount)}</span> ever
                            </span>
                        </h3>
                        <Heatmap
                            days={days}
                            label={`Days ${user.username} used PlayRates, last 12 weeks`}
                            describe={(d) => `${bucketLabel(d.day, "day")}: ${d.value ? "used PlayRates" : "not here"}`}
                        />
                    </section>

                    <section>
                        <h3 className="flex items-baseline justify-between gap-3 border-b border-subtle pb-2 text-label text-content-muted">
                            Latest
                            <Link to={`/admin/activity?user=${user.id}`} className="relative font-medium text-brand before:absolute before:-inset-x-2 before:-inset-y-3.5 before:content-[''] hover:underline sm:before:hidden">
                                All their activity
                            </Link>
                        </h3>
                        <ActivityFeed filters={{ userId: user.id }} compact limit={5} />
                    </section>

                    <Link to={`/user/${user.username}`} className={buttonClass("secondary", "w-full sm:w-auto sm:self-start")}>
                        Open their profile
                    </Link>
                </div>
            )}
        </Modal>
    );
};

export default UserModal;

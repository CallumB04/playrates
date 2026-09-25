import { Palette } from "lucide-react";
import { cardClass } from "../../../components/ui/Card";
import type { Profile, UserStats } from "@playrates/shared";
import type { ReactNode } from "react";
import ProfilePicture from "../../../components/ProfilePicture";
import PresenceDot from "../../../components/ui/PresenceDot";
import Stat from "../../../components/ui/Stat";
import Progress from "../../../components/ui/Progress";
import UserStatus from "../../../components/UserStatus";
import RatingBadge from "../../../components/ui/RatingBadge";
import {
    GAME_STATUSES,
    STATUS_PRESENTATION,
    type GameStatus,
} from "../../../constants/gameStatus";
import { formatCount, formatHours, formatMonthYear } from "../../../lib/format";
import { accentHue, bannerGradient } from "../../../lib/profileAccent";
import { cn } from "../../../lib/cn";

interface MemberFileHeaderProps {
    profile: Profile;
    stats: UserStats | undefined;
    reviewCount: number | undefined;
    friendCount: number | undefined;
    /** The friend button, or the owner's controls. */
    action: ReactNode;
    /** Set only on your own profile: makes the picture and the banner open
     *  the editor. */
    onEditPicture?: () => void;
}

/** The split of a shelf across the four states, as one stacked bar. */
const ShelfBar = ({
    byStatus,
    total,
}: {
    byStatus: Partial<Record<GameStatus, number>>;
    total: number;
}) => {
    if (total === 0) return null;

    return (
        <div>
            <Progress
                size="lg"
                label={GAME_STATUSES.map(
                    (status) =>
                        `${STATUS_PRESENTATION[status].label}: ${byStatus[status] ?? 0}`
                ).join(", ")}
                segments={GAME_STATUSES.map((status) => {
                    const count = byStatus[status] ?? 0;
                    return {
                        key: status,
                        value: count / total,
                        className: STATUS_PRESENTATION[status].accent,
                        title: `${STATUS_PRESENTATION[status].label}: ${count}`,
                    };
                })}
            />

            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
                {GAME_STATUSES.map((status) => {
                    const { label, accent } = STATUS_PRESENTATION[status];
                    return (
                        <span
                            key={status}
                            className="flex items-center gap-1.5 text-label-sm text-content-muted"
                        >
                            <span
                                aria-hidden
                                className={cn("size-2 rounded-full", accent)}
                            />
                            {label}
                            <span className="font-mono text-content">
                                {formatCount(byStatus[status] ?? 0)}
                            </span>
                        </span>
                    );
                })}
            </div>
        </div>
    );
};

/** The profile header: four figures and the shelf bar. */
const MemberFileHeader = ({
    profile,
    stats,
    reviewCount,
    friendCount,
    action,
    onEditPicture,
}: MemberFileHeaderProps) => {
    const banner = bannerGradient(accentHue(profile.accent));
    const byStatus = stats?.byStatus ?? {};
    const shelfTotal = GAME_STATUSES.reduce(
        (sum, status) => sum + (byStatus[status] ?? 0),
        0
    );

    return (
        <section
            className={cardClass("relative overflow-hidden", {
                padding: "none",
            })}
        >
            {/* A band behind the avatar, so a profile opens with something
                other than a white rectangle. It carries the profile's colour,
                which is also the avatar's. */}
            {onEditPicture ? (
                <button
                    type="button"
                    aria-label="Change your profile colour"
                    onClick={onEditPicture}
                    style={{ backgroundImage: banner }}
                    className={cn(
                        "group block h-20 w-full cursor-pointer sm:h-24",
                        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                    )}
                >
                    {/* Standing, because a phone cannot hover to find it. */}
                    <span className="float-right m-2.5 flex items-center gap-1.5 rounded-full bg-surface-raised/80 px-2.5 py-1 text-label-sm text-content-secondary backdrop-blur-sm transition-colors group-hover:text-content">
                        <Palette className="size-3.5" aria-hidden />
                        Colour
                    </span>
                </button>
            ) : (
                <div
                    aria-hidden
                    style={{ backgroundImage: banner }}
                    className="h-20 sm:h-24"
                />
            )}

            <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                <div className="-mt-12 flex flex-wrap items-end justify-between gap-4 sm:-mt-14">
                    <span className="relative inline-block rounded-full ring-4 ring-surface-raised">
                        <ProfilePicture
                            variant="profileHeader"
                            file={profile.avatarUrl ?? ""}
                            username={profile.username}
                            link={false}
                            accent={profile.accent}
                            action={
                                onEditPicture && {
                                    label: "Change your profile picture",
                                    onClick: onEditPicture,
                                }
                            }
                        />
                        <PresenceDot online={profile.online} size="lg" />
                    </span>

                    <div className="flex items-center gap-2">{action}</div>
                </div>

                <div className="mt-4 flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
                    <h1 className="font-display text-title text-content">
                        {profile.username}
                    </h1>
                    <UserStatus online={profile.online} />
                    <span className="text-label text-content-muted">
                        Member since {formatMonthYear(profile.createdAt)}
                    </span>
                </div>

                {profile.bio && (
                    <p className="mt-2.5 max-w-[52ch] text-sm leading-relaxed text-content-secondary">
                        {profile.bio}
                    </p>
                )}

                <div className="mt-5 grid gap-5 border-t border-subtle pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-8">
                    <div className="flex flex-wrap gap-x-7 gap-y-4">
                        <Stat
                            label="Hours played"
                            loading={!stats}
                            value={formatHours(stats?.hoursPlayed)}
                        />
                        <Stat
                            label="Average rating"
                            loading={!stats}
                            value={
                                <RatingBadge
                                    value={stats?.averageRating ?? null}
                                    size="md"
                                />
                            }
                        />
                        <Stat
                            label="Reviews"
                            loading={reviewCount === undefined}
                            value={formatCount(reviewCount)}
                        />
                        <Stat
                            label="Friends"
                            loading={friendCount === undefined}
                            value={formatCount(friendCount)}
                        />
                    </div>

                    <ShelfBar byStatus={byStatus} total={shelfTotal} />
                </div>
            </div>
        </section>
    );
};

export default MemberFileHeader;

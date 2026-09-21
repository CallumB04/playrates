import type { Profile, UserStats } from "@playrates/shared";
import type { ReactNode } from "react";
import ProfilePicture from "../../../components/ProfilePicture";
import PresenceDot from "../../../components/ui/PresenceDot";
import {
    GAME_STATUSES,
    STATUS_PRESENTATION,
    type GameStatus,
} from "../../../constants/gameStatus";
import {
    formatCount,
    formatHours,
    formatMonthYear,
    formatRatingOutOfTen,
} from "../../../lib/format";
import { cn } from "../../../lib/cn";

interface MemberFileHeaderProps {
    profile: Profile;
    stats: UserStats | undefined;
    reviewCount: number | undefined;
    friendCount: number | undefined;
    /** The friend button, or the owner's controls. */
    action: ReactNode;
}

/**
 * The split of a shelf across the four states, as one bar.
 *
 * Four counts in a row tell you the numbers; they do not tell you the shape
 * of somebody's habits. One stacked bar does both, so whether a person
 * finishes things or hoards them is legible before you read a figure.
 */
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
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-sunken">
                {GAME_STATUSES.map((status) => {
                    const count = byStatus[status] ?? 0;
                    if (count === 0) return null;
                    return (
                        <span
                            key={status}
                            className={cn(
                                "h-full",
                                STATUS_PRESENTATION[status].accent
                            )}
                            style={{ width: `${(count / total) * 100}%` }}
                            title={`${STATUS_PRESENTATION[status].label}: ${count}`}
                        />
                    );
                })}
            </div>

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

const Figure = ({ label, value }: { label: string; value: string }) => (
    <div>
        <p className="font-mono text-figure-lg text-content">{value}</p>
        <p className="text-label-sm text-content-muted">{label}</p>
    </div>
);

/**
 * The profile header.
 *
 * The four figures used to be a row of ledger lines under a hairline, which
 * is the same furniture whether a shelf holds three games or four hundred.
 * The bar is the part that says something about the person.
 */
const MemberFileHeader = ({
    profile,
    stats,
    reviewCount,
    friendCount,
    action,
}: MemberFileHeaderProps) => {
    const byStatus = stats?.byStatus ?? {};
    const shelfTotal = GAME_STATUSES.reduce(
        (sum, status) => sum + (byStatus[status] ?? 0),
        0
    );

    return (
        <section className="relative overflow-hidden rounded-lg border border-subtle bg-surface-raised shadow-plate">
            {/* A band behind the avatar, so a profile opens with something
                other than a white rectangle. */}
            <div
                aria-hidden
                className="h-20 bg-linear-to-r from-brand/25 via-brand/10 to-transparent sm:h-24"
            />

            <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                <div className="-mt-12 flex flex-wrap items-end justify-between gap-4 sm:-mt-14">
                    <span className="relative inline-block rounded-full ring-4 ring-surface-raised">
                        <ProfilePicture
                            variant="profileHeader"
                            file={profile.avatarUrl ?? ""}
                            username={profile.username}
                            link={false}
                        />
                        <PresenceDot online={profile.online} size="lg" />
                    </span>

                    <div className="flex items-center gap-2">{action}</div>
                </div>

                <div className="mt-4 flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
                    <h1 className="font-display text-title text-content">
                        {profile.username}
                    </h1>
                    <span
                        className={cn(
                            "flex items-center gap-1.5 text-label",
                            profile.online
                                ? "text-success"
                                : "text-content-muted"
                        )}
                    >
                        <span
                            aria-hidden
                            className={cn(
                                "size-[7px] rounded-full",
                                profile.online
                                    ? "bg-success"
                                    : "bg-content-muted"
                            )}
                        />
                        {profile.online ? "Online" : "Offline"}
                    </span>
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
                        <Figure
                            label="Hours played"
                            value={formatHours(stats?.hoursPlayed)}
                        />
                        <Figure
                            label="Average rating"
                            value={formatRatingOutOfTen(stats?.averageRating)}
                        />
                        <Figure
                            label="Reviews"
                            value={formatCount(reviewCount)}
                        />
                        <Figure
                            label="Friends"
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

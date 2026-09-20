import type { Profile, UserStats } from "@playrates/shared";
import type { ReactNode } from "react";
import ProfilePicture from "../../../components/ProfilePicture";
import LedgerRow from "../../../components/ui/LedgerRow";
import { formatCount, formatHours, formatMonthYear } from "../../../lib/format";
import { cn } from "../../../lib/cn";

interface MemberFileHeaderProps {
    profile: Profile;
    stats: UserStats | undefined;
    reviewCount: number | undefined;
    friendCount: number | undefined;
    /** The friend button, or Edit profile on your own page. */
    action: ReactNode;
}

/**
 * The member file. Avatar pressed into a well, the name set large, and four
 * ledger stats under a hairline — the same furniture whether the shelf holds
 * three games or four hundred.
 */
const MemberFileHeader = ({
    profile,
    stats,
    reviewCount,
    friendCount,
    action,
}: MemberFileHeaderProps) => {
    const figures = [
        { label: "Games logged", value: formatCount(stats?.logCount) },
        { label: "Hours played", value: formatHours(stats?.hoursPlayed) },
        { label: "Reviews", value: formatCount(reviewCount) },
        { label: "Friends", value: formatCount(friendCount) },
    ];

    return (
        <>
            <div className="flex justify-end font-mono text-label uppercase text-content-muted">
                {/* Ids are uuids, so there is no member number to print —
                    the date is the part that was ever meaningful. */}
                Opened {formatMonthYear(profile.createdAt)}
            </div>

            <section className="grid items-start gap-6 border border-strong bg-surface-raised p-5 shadow-lip sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-7 sm:p-6">
                <div className="border border-strong bg-surface-sunken p-2.5 inset-shadow-deep">
                    <span className="relative block">
                        <ProfilePicture
                            variant="profileHeader"
                            file={profile.avatarUrl ?? ""}
                            username={profile.username}
                            link={false}
                        />
                        <span
                            className={cn(
                                "absolute -bottom-1.5 -right-1.5 size-4 rounded-full border-[3px] border-surface-raised",
                                profile.online ? "bg-success" : "bg-content-muted"
                            )}
                            title={profile.online ? "Online" : "Offline"}
                        />
                    </span>
                </div>

                <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-3.5">
                        <h1 className="font-display text-title text-content">
                            {profile.username}
                        </h1>
                        <span
                            className={cn(
                                "flex items-center gap-1.5 font-mono text-label uppercase",
                                profile.online
                                    ? "text-success"
                                    : "text-content-muted"
                            )}
                        >
                            <span
                                aria-hidden
                                className={cn(
                                    "size-[7px]",
                                    profile.online
                                        ? "bg-success"
                                        : "bg-content-muted"
                                )}
                            />
                            {profile.online ? "Online" : "Offline"}
                        </span>
                    </div>

                    {profile.bio && (
                        <p className="mt-2.5 max-w-[58ch] text-sm leading-relaxed text-content-secondary">
                            {profile.bio}
                        </p>
                    )}

                    <dl className="mt-4 grid gap-x-7 border-t border-subtle pt-3 sm:grid-cols-2 xl:grid-cols-4">
                        {figures.map((figure) => (
                            <LedgerRow
                                key={figure.label}
                                label={figure.label}
                                value={figure.value}
                                rule={false}
                                className="[&>dd]:text-figure-row"
                            />
                        ))}
                    </dl>
                </div>

                <div className="sm:justify-self-end">{action}</div>
            </section>
        </>
    );
};

export default MemberFileHeader;

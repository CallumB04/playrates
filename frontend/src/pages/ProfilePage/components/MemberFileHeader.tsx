import type { Profile, UserStats } from "@playrates/shared";
import type { ReactNode } from "react";
import ProfilePicture from "../../../components/ProfilePicture";
import PresenceDot from "../../../components/ui/PresenceDot";
import UserStatus from "../../../components/UserStatus";
import RatingBadge from "../../../components/ui/RatingBadge";
import { figureClass } from "../../../components/ui/Figure";
import { formatHours, formatMonthYear } from "../../../lib/format";
import { Link } from "react-router-dom";
import AvatarFrame from "../../../components/progress/AvatarFrame";
import ShowcaseView, {
    showcaseOf,
} from "../../../components/progress/ShowcaseView";
import { usePlayerBadges } from "../../../hooks/queries/useProgress";
import { profilePath } from "../../../lib/profilePaths";
import { cn } from "../../../lib/cn";

/** Their level and the badges they pinned, one line for everyone, the way
 *  into their Badges tab. */
const LevelRow = ({ username, level }: { username: string; level: number }) => {
    const { data } = usePlayerBadges(username);
    const shown = data ? showcaseOf(data) : [];
    return (
        <Link
            to={profilePath(username, "badges")}
            className="mt-3 flex w-max max-w-full flex-wrap items-center gap-x-3 gap-y-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
        >
            <span className="flex items-baseline gap-1.5">
                <span className="text-label text-content-muted">Level</span>
                <span className="font-display text-[20px] leading-none font-bold text-content tabular-nums">
                    {level}
                </span>
            </span>
            {shown.length > 0 && (
                <>
                    <span aria-hidden className="h-5 w-px bg-subtle" />
                    <ShowcaseView layout={data!.layout} badges={shown} />
                </>
            )}
        </Link>
    );
};

interface MemberFileHeaderProps {
    profile: Profile;
    /** Their figures, once this viewer may see them and they have loaded. */
    stats?: UserStats;
    /** When the viewer and this member became friends, if they are. */
    friendsSince?: string;
    /** A friend request from them, waiting on the viewer's answer. */
    request?: ReactNode;
    /** The friend button, or the owner's controls. */
    action: ReactNode;
    /** Set only on your own profile: makes the picture open the editor. */
    onEditPicture?: () => void;
}

/** The top of a profile: who they are, and what you can do about it. */
const MemberFileHeader = ({
    profile,
    stats,
    friendsSince,
    request,
    action,
    onEditPicture,
}: MemberFileHeaderProps) => (
    /* No card: it sits on the page, or on the picture a profile chose, as a
       game's title sits on its art. */
    <section className="relative">
        {profile.effects.includes("effect_sheen") && (
            // Bought: a light that crosses the top of the profile.
            <span
                aria-hidden
                className="pointer-events-none absolute -inset-x-4 -top-6 bottom-0 animate-sheen opacity-60"
                style={{
                    backgroundImage:
                        "linear-gradient(105deg, transparent 40%, var(--glow-brand) 50%, transparent 60%)",
                    backgroundSize: "250% 100%",
                }}
            />
        )}
        {/* Stacked until there is room beside the name for the buttons;
            then the buttons sit at the foot of it, by what they act on,
            rather than up on the picture by the avatar. */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-6">
            <span className="relative inline-block shrink-0 self-start">
                <AvatarFrame frame={profile.frame} size="xl">
                    <span className="relative inline-block rounded-full ring-4 ring-surface">
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
                </AvatarFrame>
            </span>

            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
                    <h1
                        className={cn(
                            "font-display text-title break-words text-content",
                            profile.effects.includes("effect_glow") &&
                                "pr-name-glow"
                        )}
                    >
                        {profile.username}
                    </h1>
                    <UserStatus online={profile.online} />
                    <span className="text-label text-content-muted">
                        Member since {formatMonthYear(profile.createdAt)}
                    </span>
                    {/* Here, not under the friend button, where it moved
                        the buttons each time the friendship changed. */}
                    {friendsSince && (
                        <span className="text-label text-content-muted">
                            Friends since {new Date(friendsSince).getFullYear()}
                        </span>
                    )}
                </div>

                {stats && (
                    <p className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-label text-content-muted">
                        <span className="flex items-baseline gap-1.5">
                            <span className={figureClass("row")}>
                                {formatHours(stats.hoursPlayed)}
                            </span>
                            played
                        </span>
                        <span className="flex items-baseline gap-1.5">
                            <RatingBadge
                                value={stats.averageRating}
                                size="row"
                            />
                            average rating
                        </span>
                    </p>
                )}
                <LevelRow username={profile.username} level={profile.level} />
            </div>

            <div className="flex gap-2 lg:shrink-0">{action}</div>
        </div>

        {request}
    </section>
);

export default MemberFileHeader;

import { Palette } from "lucide-react";
import { cardClass } from "../../../components/ui/Card";
import type { Profile } from "@playrates/shared";
import type { ReactNode } from "react";
import ProfilePicture from "../../../components/ProfilePicture";
import PresenceDot from "../../../components/ui/PresenceDot";
import UserStatus from "../../../components/UserStatus";
import { formatMonthYear } from "../../../lib/format";
import { accentHue, bannerGradient } from "../../../lib/profileAccent";
import { cn } from "../../../lib/cn";

interface MemberFileHeaderProps {
    profile: Profile;
    /** When the viewer and this member became friends, if they are. */
    friendsSince?: string;
    /** A friend request from them, waiting on the viewer's answer. */
    request?: ReactNode;
    /** The friend button, or the owner's controls. */
    action: ReactNode;
    /** Set only on your own profile: makes the picture and the banner open
     *  the editor. */
    onEditPicture?: () => void;
}

/** The profile card: who they are, and what you can do about it. */
const MemberFileHeader = ({
    profile,
    friendsSince,
    request,
    action,
    onEditPicture,
}: MemberFileHeaderProps) => {
    const banner = bannerGradient(accentHue(profile.accent));
    /* A chosen picture spans the top of the page instead, and the card
       steps aside so the profile sits on it, as a game's title does. */
    const band = !profile.background;

    return (
        <section
            className={
                band
                    ? cardClass("relative overflow-hidden", { padding: "none" })
                    : "relative"
            }
        >
            {/* A band behind the avatar, so a profile opens with something
                other than a white rectangle. It carries the profile's colour,
                which is also the avatar's. */}
            {!band ? null : onEditPicture ? (
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

            <div className={cn(band && "px-5 pb-5 sm:px-6 sm:pb-6")}>
                {/* Only the avatar reaches up into the banner. On a phone the
                    44px buttons are taller than the part of it below the
                    band, so lifted with it they would sit on the colour. */}
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <span
                        className={cn(
                            "relative inline-block self-start rounded-full ring-4",
                            band
                                ? "-mt-12 ring-surface-raised sm:-mt-14"
                                : "ring-surface"
                        )}
                    >
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

                    <div className="mt-3 flex items-center gap-2 self-start">
                        {action}
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
                    <h1 className="font-display text-title text-content">
                        {profile.username}
                    </h1>
                    <UserStatus online={profile.online} />
                    <span className="text-label text-content-muted">
                        Member since {formatMonthYear(profile.createdAt)}
                    </span>
                    {/* Here, not under the friend button, where it moved the
                        buttons each time the friendship changed. */}
                    {friendsSince && (
                        <span className="text-label text-content-muted">
                            Friends since {new Date(friendsSince).getFullYear()}
                        </span>
                    )}
                </div>

                {profile.bio && (
                    <p className="mt-2.5 max-w-[52ch] text-sm leading-relaxed text-content-secondary">
                        {profile.bio}
                    </p>
                )}

                {request}
            </div>
        </section>
    );
};

export default MemberFileHeader;

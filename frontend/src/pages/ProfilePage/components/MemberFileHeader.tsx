import type { Profile } from "@playrates/shared";
import type { ReactNode } from "react";
import ProfilePicture from "../../../components/ProfilePicture";
import PresenceDot from "../../../components/ui/PresenceDot";
import UserStatus from "../../../components/UserStatus";
import { formatMonthYear } from "../../../lib/format";

interface MemberFileHeaderProps {
    profile: Profile;
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
    friendsSince,
    request,
    action,
    onEditPicture,
}: MemberFileHeaderProps) => (
    /* No card: it sits on the page, or on the picture a profile chose, as a
       game's title sits on its art. */
    <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
            <span className="relative inline-block self-start rounded-full ring-4 ring-surface">
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
    </section>
);

export default MemberFileHeader;

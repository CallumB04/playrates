import { Link } from "react-router-dom";
import type { FriendUser } from "@playrates/shared";
import ProfilePicture, { type AvatarVariant } from "./ProfilePicture";
import { cn } from "../lib/cn";

/**
 * Two named densities rather than a size number, so the avatar, spacing and
 * type stay in step with each other.
 */
const DENSITY = {
    compact: { avatar: "friendRow", gap: "gap-2.5", text: "text-body-sm" },
    comfortable: { avatar: "friendRowLarge", gap: "gap-3", text: "text-body" },
} as const satisfies Record<
    string,
    { avatar: AvatarVariant; gap: string; text: string }
>;

export type FriendProfileDensity = keyof typeof DENSITY;

interface FriendProfileProps {
    user: FriendUser;
    /** Optional: supplied when the row is rendered inside a popup. */
    closePopup?: () => void;
    density: FriendProfileDensity;
    /** A mono figure on the right, e.g. "Friends since 2023". */
    trailing?: string;
}

const FriendProfile = ({
    user,
    closePopup,
    density,
    trailing,
}: FriendProfileProps) => {
    const { avatar, gap, text } = DENSITY[density];

    return (
        <Link
            to={`/user/${user.username}`}
            className={cn(
                "plate-press flex w-full items-center px-1.5 py-1.5 hover:bg-surface-hover",
                gap
            )}
            onClick={closePopup}
        >
            <span className="relative shrink-0">
                <ProfilePicture
                    variant={avatar}
                    username={user.username}
                    file={user.avatarUrl ?? ""}
                    link={false}
                />
                {/* One of only two round things in the system. */}
                <span
                    className={cn(
                        "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-surface-raised",
                        user.online ? "bg-success" : "bg-content-muted"
                    )}
                    title={user.online ? "Online" : "Offline"}
                />
            </span>
            <span className={cn("min-w-0 flex-1 truncate text-content", text)}>
                {user.username}
            </span>
            {trailing && (
                <span className="shrink-0 text-label-sm text-content-muted">
                    {trailing}
                </span>
            )}
        </Link>
    );
};

export default FriendProfile;

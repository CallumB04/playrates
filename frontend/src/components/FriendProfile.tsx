import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { FriendUser } from "@playrates/shared";
import ProfilePicture, { type AvatarVariant } from "./ProfilePicture";
import PresenceDot from "./ui/PresenceDot";
import { cn } from "../lib/cn";

/* Named densities rather than a size number, so the avatar, spacing and type
   stay in step. */
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
    /** A caption on the right, e.g. "Online". */
    trailing?: string;
    /** Buttons on the same row. Kept outside the link — no nested controls. */
    actions?: ReactNode;
}

const FriendProfile = ({
    user,
    closePopup,
    density,
    trailing,
    actions,
}: FriendProfileProps) => {
    const { avatar, gap, text } = DENSITY[density];

    const link = (
        <Link
            to={`/user/${user.username}`}
            className={cn(
                "flex min-w-0 items-center rounded-sm px-2 py-2 lift hover:bg-surface-hover",
                actions ? "flex-1" : "w-full",
                gap
            )}
            onClick={closePopup}
        >
            <span className="relative inline-block shrink-0">
                <ProfilePicture
                    variant={avatar}
                    username={user.username}
                    file={user.avatarUrl ?? ""}
                    link={false}
                />
                <PresenceDot online={user.online} />
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

    if (!actions) return link;

    return (
        <div className="flex w-full items-center gap-2">
            {link}
            <span className="flex shrink-0 items-center gap-2 pr-1">
                {actions}
            </span>
        </div>
    );
};

export default FriendProfile;

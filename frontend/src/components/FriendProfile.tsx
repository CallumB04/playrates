import { Link } from "react-router-dom";
import type { FriendUser } from "@playrates/shared";
import ProfilePicture, { AvatarVariant } from "./ProfilePicture";

/**
 * Was driven by a raw `profilePictureSize: number` that the component then
 * compared against 12 to pick its gap and text size. Two named densities make
 * the relationship between avatar, spacing and type explicit.
 */
const DENSITY = {
    compact: { avatar: "friendRow", gap: "gap-2", text: "text-base" },
    comfortable: { avatar: "friendRowLarge", gap: "gap-3", text: "text-lg" },
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
}

const FriendProfile: React.FC<FriendProfileProps> = ({
    user,
    closePopup,
    density,
}) => {
    const { avatar, gap, text } = DENSITY[density];

    return (
        <Link
            to={`/user/${user.username}`}
            className={`group relative flex w-full items-center ${gap} rounded-md px-2 py-1 transition-colors duration-200 hover:bg-surface-popup-to`}
            onClick={closePopup}
        >
            <ProfilePicture
                variant={avatar}
                username={user.username}
                file={user.pictureUrl ?? ""}
                link={false}
            />
            <p className={`font-lexend text-content ${text}`}>
                {user.username}
            </p>
            <div
                className={`absolute left-[6px] top-[6px] size-[14px] rounded-full border-[1.5px] border-content-inverse ${user.online ? "bg-success" : "bg-danger"} `}
                title={user.online ? "Online" : "Offline"}
            ></div>
        </Link>
    );
};

export default FriendProfile;

import { Link } from "react-router-dom";

/**
 * Each variant is a complete, literal class string. The previous version built
 * its sizing and border-width utilities at runtime, which required a safelist
 * to survive purging. There are only five call sites and each is a deliberate
 * design choice, so naming them is clearer than passing numbers around.
 */
const AVATAR_VARIANT = {
    /** Profile page header — responsive across three breakpoints. */
    profileHeader: "size-20 border-2 sm:size-28 lg:size-40 lg:border-3",
    /** Edit-profile popup. */
    editProfile: "size-40 border-3",
    /** Reviewer avatar on the game page. */
    review: "size-16 border-2",
    /** Friend list in the profile sidebar. */
    friendRow: "size-10 border-2",
    /** Friend list inside the friends popup. */
    friendRowLarge: "size-12 border-2",
} as const;

export type AvatarVariant = keyof typeof AVATAR_VARIANT;

interface ProfilePictureProps {
    variant: AvatarVariant;
    file: string;
    username: string;
    /** Render as a link to the user's profile. Prevents nested <a> elements. */
    link: boolean;
}

const ProfilePicture: React.FC<ProfilePictureProps> = ({
    variant,
    file,
    username,
    link,
}) => {
    const className = `profile-picture-wrapper border-content-inverse ${AVATAR_VARIANT[variant]}`;
    const image = file ? (
        <img
            src={file}
            alt={`${username}'s profile picture`}
            className="profile-picture"
        />
    ) : null;

    return link ? (
        <Link to={`/user/${username}`} className={className}>
            {image}
        </Link>
    ) : (
        <div className={className}>{image}</div>
    );
};

export default ProfilePicture;

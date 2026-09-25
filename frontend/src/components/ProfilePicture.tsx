import { Link } from "react-router-dom";
import { Camera } from "lucide-react";
import type { ProfileAccent } from "@playrates/shared";
import { accentHue, avatarGradient } from "../lib/profileAccent";
import { cn } from "../lib/cn";

/* Complete literal class strings — Tailwind only emits what it can see. The
   initial scales with the box, so the two travel together. */
const AVATAR_VARIANT = {
    /** Profile page header — responsive across three breakpoints. */
    profileHeader: {
        box: "size-20 sm:size-28 lg:size-40",
        text: "text-3xl sm:text-4xl lg:text-6xl",
    },
    /** Edit-profile popup. */
    editProfile: { box: "size-40", text: "text-6xl" },
    /** Reviewer avatar on the game page. */
    review: { box: "size-16", text: "text-2xl" },
    /** The header. */
    nav: { box: "size-9", text: "text-sm" },
    /** Friend list in the profile sidebar. */
    friendRow: { box: "size-10", text: "text-base" },
    /** Friend list inside the friends popup. */
    friendRowLarge: { box: "size-12", text: "text-lg" },
} as const;

export type AvatarVariant = keyof typeof AVATAR_VARIANT;

interface ProfilePictureProps {
    variant: AvatarVariant;
    file: string;
    username: string;
    /** Render as a link to the user's profile. Prevents nested <a> elements. */
    link: boolean;
    /** Makes the picture a button — your own, on your own profile. Takes
     *  precedence over `link`: a picture cannot be both. */
    action?: { label: string; onClick: () => void };
    /** The profile's colour. Unset falls back to the brand. */
    accent?: ProfileAccent;
}

/**
 * The uploaded picture, or one generated from the username. The same person
 * gets the same colour everywhere.
 */
const ProfilePicture: React.FC<ProfilePictureProps> = ({
    variant,
    file,
    username,
    link,
    action,
    accent,
}) => {
    const { box, text } = AVATAR_VARIANT[variant];
    const hue = accentHue(accent);

    const className = cn(
        "relative grid aspect-square shrink-0 place-items-center overflow-hidden rounded-full bg-surface-sunken select-none",
        box
    );

    /* Standing, not on hover: a touch screen cannot hover, and this is the
       only thing that says the picture is a control. */
    const editBadge = (
        <span
            aria-hidden
            className={cn(
                "absolute inset-x-0 bottom-0 grid h-[30%] place-items-center",
                "bg-black/55 text-white/95 backdrop-blur-[1px] transition-colors",
                "group-hover:bg-black/70"
            )}
        >
            <Camera className="size-[38%] min-w-3" strokeWidth={2.25} />
        </span>
    );

    const body = file ? (
        <img
            src={file}
            alt={`${username}'s profile picture`}
            className="size-full object-cover"
        />
    ) : (
        <>
            <span
                aria-hidden
                className="absolute inset-0"
                style={{ backgroundImage: avatarGradient(hue) }}
            />
            {/* The same tooth used on box art, so a generated avatar reads as
                part of the same material. */}
            <span aria-hidden className="absolute inset-0 hatch" />
            <span
                className={cn(
                    "relative font-display font-semibold text-white/95",
                    text
                )}
            >
                {username.charAt(0).toUpperCase()}
            </span>
        </>
    );

    if (action) {
        return (
            <button
                type="button"
                aria-label={action.label}
                onClick={action.onClick}
                className={cn(
                    className,
                    "group cursor-pointer",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                )}
            >
                {body}
                {editBadge}
            </button>
        );
    }

    return link ? (
        <Link to={`/user/${username}`} className={className}>
            {body}
        </Link>
    ) : (
        <div className={className}>{body}</div>
    );
};

export default ProfilePicture;

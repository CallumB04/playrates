import { Link } from "react-router-dom";
import { cn } from "../lib/cn";

/* Each variant is a complete literal class string — Tailwind only emits
   classes it can see in the source. The initial has to scale with the box,
   so the two travel together. */
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

/**
 * A stable hue per username.
 *
 * FNV-1a rather than a sum of char codes, which would give anagrams and most
 * short names the same colour.
 */
const hueFor = (username: string): number => {
    let hash = 0x811c9dc5;
    for (let i = 0; i < username.length; i += 1) {
        hash ^= username.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0) % 360;
};

interface ProfilePictureProps {
    variant: AvatarVariant;
    file: string;
    username: string;
    /** Render as a link to the user's profile. Prevents nested <a> elements. */
    link: boolean;
}

/**
 * The uploaded picture, or a generated one.
 *
 * The old fallback was a grey stock silhouette served from /assets, identical
 * for everybody — so a friend list read as a column of the same stranger. This
 * derives a hue from the username instead: the same person is the same colour
 * everywhere, and a list of people looks like a list of people.
 */
const ProfilePicture: React.FC<ProfilePictureProps> = ({
    variant,
    file,
    username,
    link,
}) => {
    const { box, text } = AVATAR_VARIANT[variant];
    const hue = hueFor(username);

    /* Round. Faces are round everywhere else on the internet, and the square
       avatar was only ever a consequence of square-by-default. */
    const className = cn(
        "relative grid aspect-square shrink-0 place-items-center overflow-hidden rounded-full bg-surface-sunken select-none",
        box
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
                style={{
                    backgroundImage: `linear-gradient(145deg, hsl(${hue} 70% 62%), hsl(${
                        (hue + 45) % 360
                    } 62% 42%))`,
                }}
            />
            {/* The same tooth used on box art, so a generated avatar reads as
                part of the same material. */}
            <span aria-hidden className="hatch absolute inset-0" />
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

    return link ? (
        <Link to={`/user/${username}`} className={className}>
            {body}
        </Link>
    ) : (
        <div className={className}>{body}</div>
    );
};

export default ProfilePicture;

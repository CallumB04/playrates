import { accentHue, type ProfileAccent } from "@playrates/shared";

/** A stable hue per username. FNV-1a, so anagrams don't collide. */
export const hueFor = (username: string): number => {
    let hash = 0x811c9dc5;
    for (let i = 0; i < username.length; i += 1) {
        hash ^= username.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0) % 360;
};

/**
 * The hue a profile is drawn in: the one it chose, or the one its username
 * hashes to. Every profile has a colour from the moment it exists; choosing
 * only replaces the guess.
 */
export const profileHue = (
    username: string,
    accent: ProfileAccent | null | undefined
): number => accentHue(accent ?? null) ?? hueFor(username);

/** The avatar's fill. Two stops off one hue, so a chosen colour reads as one
 *  colour rather than two. */
export const avatarGradient = (hue: number): string =>
    `linear-gradient(145deg, hsl(${hue} 70% 62%), hsl(${(hue + 45) % 360} 62% 42%))`;

/* The banner is the same hue at a fraction of its strength: it sits behind
   the avatar and the username, and has to stay a background in both themes. */
export const bannerGradient = (hue: number): string =>
    `linear-gradient(to right, hsl(${hue} 70% 62% / 0.34), hsl(${
        (hue + 45) % 360
    } 62% 52% / 0.14) 55%, transparent)`;

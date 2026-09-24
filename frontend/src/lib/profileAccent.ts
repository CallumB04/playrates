import { accentHue } from "@playrates/shared";

export { accentHue };

/** The avatar's fill. Two stops off one hue, so a chosen colour reads as one
 *  colour rather than two. */
export const avatarGradient = (hue: number): string =>
    `linear-gradient(145deg, hsl(${hue} 70% 62%), hsl(${(hue + 45) % 360} 62% 42%))`;

/* The banner carries the same hue, softer than the avatar because a username
   sits on it — but it never runs out to transparent. Fading to the page left
   the right-hand half looking like an unpainted rectangle rather than part of
   the profile. */
export const bannerGradient = (hue: number): string =>
    `linear-gradient(105deg, hsl(${hue} 72% 58% / 0.62), hsl(${
        (hue + 40) % 360
    } 66% 54% / 0.38) 58%, hsl(${(hue + 40) % 360} 60% 56% / 0.24))`;

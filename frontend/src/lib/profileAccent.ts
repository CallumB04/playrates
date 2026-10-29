import { accentHue } from "@playrates/shared";

export { accentHue };

/** The avatar's fill. Two stops off one hue, so a chosen colour reads as one
 *  colour rather than two. */
export const avatarGradient = (hue: number): string =>
    `linear-gradient(145deg, hsl(${hue} 70% 62%), hsl(${(hue + 45) % 360} 62% 42%))`;

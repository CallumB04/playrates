import type { AvatarChoice } from "./AvatarField";

/** Whether a profile will show a picture once this choice is saved. Without
 *  one it shows its initial on its colour, so only then is the colour
 *  worth choosing. */
export const willShowPicture = (
    current: string | null,
    choice: AvatarChoice
): boolean =>
    choice.kind === "picked" || (choice.kind === "unchanged" && !!current);

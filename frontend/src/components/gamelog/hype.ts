import { HYPE_MAX } from "@playrates/shared";

export const HYPE_LEVELS = Array.from({ length: HYPE_MAX }, (_, i) => i + 1);

/** "4 of 5 flames", for anything that can't see the flames. */
export const hypeLabel = (hype: number): string =>
    `${hype} of ${HYPE_MAX} flames`;

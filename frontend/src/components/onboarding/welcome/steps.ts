/** The welcome, in order. Signing up is the step before these, already
 *  done by the time anyone sees them. */
export const WELCOME_STEPS = ["you", "games", "rate", "tour", "done"] as const;
export type WelcomeStep = (typeof WELCOME_STEPS)[number];

import {
    Compass,
    Flag,
    Gamepad2,
    Star,
    UserRound,
    UserRoundCheck,
} from "lucide-react";

/** What the track calls each, the account first and always done. */
export const TRACK_LABELS = [
    "Account",
    "You",
    "Games",
    "Rate",
    "Tour",
    "Done",
] as const;

/** Each step's mark beside its name. */
export const TRACK_ICONS = [
    UserRoundCheck,
    UserRound,
    Gamepad2,
    Star,
    Compass,
    Flag,
] as const;

/** The step a link names, or the first for anything else. */
export const stepFrom = (raw: string | null): WelcomeStep =>
    (WELCOME_STEPS as readonly string[]).includes(raw ?? "")
        ? (raw as WelcomeStep)
        : "you";

/** Where a step sits on the track, the account being 0. */
export const trackIndex = (step: WelcomeStep): number =>
    WELCOME_STEPS.indexOf(step) + 1;

/** The step after this one; the last stays where it is. */
export const nextStep = (step: WelcomeStep): WelcomeStep =>
    WELCOME_STEPS[
        Math.min(WELCOME_STEPS.indexOf(step) + 1, WELCOME_STEPS.length - 1)
    ]!;

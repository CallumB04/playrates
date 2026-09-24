import { z } from "zod";

/**
 * The colour a profile wears — its banner, and the generated avatar behind a
 * username's initial.
 *
 * A hue rather than a pair of hex values, because the gradient either end of
 * it is derived: one formula draws the avatar and the banner, so the two can
 * never drift apart. Every hue here is one that stays legible against both
 * themes at the lightness the formula picks.
 *
 * PlayRates first, and the rest a sweep round the wheel from red to violet.
 */
export const PROFILE_ACCENTS = [
  /** --iris-600, the brand. What a profile wears until it says otherwise. */
  { slug: "playrates", label: "PlayRates", hue: 253 },
  { slug: "ember", label: "Ember", hue: 22 },
  { slug: "amber", label: "Amber", hue: 44 },
  { slug: "lime", label: "Lime", hue: 84 },
  { slug: "moss", label: "Moss", hue: 112 },
  { slug: "jade", label: "Jade", hue: 150 },
  { slug: "teal", label: "Teal", hue: 176 },
  { slug: "azure", label: "Azure", hue: 202 },
  { slug: "indigo", label: "Indigo", hue: 228 },
  { slug: "violet", label: "Violet", hue: 268 },
  { slug: "plum", label: "Plum", hue: 292 },
  { slug: "magenta", label: "Magenta", hue: 316 },
  { slug: "rose", label: "Rose", hue: 340 },
  { slug: "crimson", label: "Crimson", hue: 356 },
] as const;

export type ProfileAccent = (typeof PROFILE_ACCENTS)[number]["slug"];

/** The column default, and the fallback wherever a colour is unreadable. */
export const DEFAULT_ACCENT: ProfileAccent = "playrates";

export const PROFILE_ACCENT_SLUGS = PROFILE_ACCENTS.map((a) => a.slug) as [
  ProfileAccent,
  ...ProfileAccent[],
];

export const ProfileAccentSchema = z.enum(PROFILE_ACCENT_SLUGS);

/** The hue to draw a profile in. Anything unrecognised is the brand, so a
 *  profile is never colourless. */
export const accentHue = (accent: string | null | undefined): number =>
  (PROFILE_ACCENTS.find((a) => a.slug === accent) ??
    PROFILE_ACCENTS.find((a) => a.slug === DEFAULT_ACCENT)!).hue;

import { z } from "zod";

/**
 * The colour a profile wears — its banner, and the generated avatar behind a
 * username's initial.
 *
 * A hue rather than a pair of hex values, because the gradient either end of
 * it is derived: one formula draws the avatar and the banner, so the two can
 * never drift apart. Every hue here is one that stays legible against both
 * themes at the lightness the formula picks.
 */
export const PROFILE_ACCENTS = [
  { slug: "violet", label: "Violet", hue: 266 },
  { slug: "indigo", label: "Indigo", hue: 228 },
  { slug: "azure", label: "Azure", hue: 202 },
  { slug: "teal", label: "Teal", hue: 176 },
  { slug: "jade", label: "Jade", hue: 150 },
  { slug: "moss", label: "Moss", hue: 110 },
  { slug: "amber", label: "Amber", hue: 44 },
  { slug: "ember", label: "Ember", hue: 22 },
  { slug: "rose", label: "Rose", hue: 344 },
  { slug: "magenta", label: "Magenta", hue: 312 },
] as const;

export type ProfileAccent = (typeof PROFILE_ACCENTS)[number]["slug"];

export const PROFILE_ACCENT_SLUGS = PROFILE_ACCENTS.map((a) => a.slug) as [
  ProfileAccent,
  ...ProfileAccent[],
];

export const ProfileAccentSchema = z.enum(PROFILE_ACCENT_SLUGS);

/** The hue of a chosen accent, or undefined if it is not one of ours. */
export const accentHue = (accent: string | null): number | undefined =>
  PROFILE_ACCENTS.find((a) => a.slug === accent)?.hue;

import type {
  AboutField,
  AboutVisibility,
  ProfileAbout,
  ProfileFacts,
  ProfileVisibility,
  MyProfile,
  Profile,
  ProfileAccent,
} from "@playrates/shared";
import {
  levelFor,
  wornFrame,
  ABOUT_FACTS,
  ABOUT_FIELDS,
  ABOUT_KEYS,
  ageOn,
  canSeeProfile,
  DEFAULT_ABOUT_VISIBILITY,
  DEFAULT_BACKGROUND_POSITION,
  FALLBACK_ACCENT,
  PROFILE_VISIBILITIES,
  PROFILE_ACCENT_SLUGS,
  sectionOrder,
  resolveEmailPrefs,
} from "@playrates/shared";
import type { ProfileRow } from "../../types/database.types.js";

/** How recently a user must have been seen to count as online. */
const ONLINE_WINDOW_MS = 5 * 60_000;

export const isOnline = (lastSeenAt: string, now = Date.now()): boolean =>
  now - Date.parse(lastSeenAt) < ONLINE_WINDOW_MS;

/* The column is text with a CHECK behind it, but a row read back is still
   just a string. Anything that is not one of ours falls back, so a profile is
   never returned without a colour. */
export const toAccent = (value: string | null): ProfileAccent =>
  (PROFILE_ACCENT_SLUGS as readonly string[]).includes(value ?? "")
    ? (value as ProfileAccent)
    : FALLBACK_ACCENT;

/* Fails closed, unlike the accent: a value this code does not know should
   hide someone's profile, not show it. */
export const toProfileVisibility = (
  value: string | undefined,
): ProfileVisibility =>
  (PROFILE_VISIBILITIES as readonly string[]).includes(value ?? "")
    ? (value as ProfileVisibility)
    : "private";

/** Who is looking at a profile, as far as its About fields care. */
export interface AboutViewer {
  isOwner: boolean;
  isFriend: boolean;
}

const STRANGER: AboutViewer = { isOwner: false, isFriend: false };

const ABOUT_COLUMNS: Record<AboutField, keyof ProfileRow> = {
  firstName: "first_name",
  pronouns: "pronouns",
  location: "location",
  website: "website",
  discord: "discord",
  steam: "steam",
};

/** Each field's visibility: what was stored, the default for the rest. A
 *  stored value this code does not know reads as private, as the profile's
 *  own visibility does. */
export const aboutVisibilityOf = (row: ProfileRow): AboutVisibility => {
  const stored = row.about_visibility ?? {};
  return Object.fromEntries(
    ABOUT_KEYS.map((key) => [
      key,
      key in stored
        ? toProfileVisibility(stored[key])
        : DEFAULT_ABOUT_VISIBILITY[key],
    ]),
  ) as AboutVisibility;
};

/** What each fact says, before who may see it is asked. */
const factValues = (row: ProfileRow, now: number): ProfileFacts => ({
  age: row.birth_date
    ? ageOn(row.birth_date, new Date(now).toISOString().slice(0, 10))
    : undefined,
  joined: row.created_at,
  // Hiding when they're online hides when they were, too.
  lastSeen: row.hide_online
    ? undefined
    : new Date(row.last_seen_at).toISOString().slice(0, 10),
});

/** Age, joined and last seen: those this viewer may see. */
export const factsFor = (
  row: ProfileRow,
  viewer: AboutViewer,
  now = Date.now(),
): ProfileFacts => {
  const visibility = aboutVisibilityOf(row);
  const values = factValues(row, now);
  return Object.fromEntries(
    ABOUT_FACTS.filter(
      (fact) =>
        values[fact] !== undefined && canSeeProfile(visibility[fact], viewer),
    ).map((fact) => [fact, values[fact]]),
  ) as ProfileFacts;
};

/** The About fields this viewer may see, and only the ones filled in. */
export const aboutFor = (
  row: ProfileRow,
  viewer: AboutViewer,
): ProfileAbout => {
  const visibility = aboutVisibilityOf(row);
  const about: ProfileAbout = {};
  for (const field of ABOUT_FIELDS) {
    const value = row[ABOUT_COLUMNS[field]];
    if (typeof value !== "string" || value === "") continue;
    if (canSeeProfile(visibility[field], viewer)) about[field] = value;
  }
  return about;
};

/** Whether any field this viewer cannot otherwise see is open to friends,
 *  so the friendship is worth looking up. */
export const aboutNeedsFriendship = (row: ProfileRow): boolean => {
  const visibility = aboutVisibilityOf(row);
  const facts = factValues(row, Date.now());
  return (
    ABOUT_FIELDS.some(
      (field) => visibility[field] === "friends" && !!row[ABOUT_COLUMNS[field]],
    ) ||
    ABOUT_FACTS.some(
      (fact) => visibility[fact] === "friends" && facts[fact] !== undefined,
    )
  );
};

/** Rows are snake_case, the API is camelCase. Pure, so it's testable without
 *  a database. */
export const toProfile = (
  row: ProfileRow,
  now = Date.now(),
  viewer: AboutViewer = STRANGER,
): Profile => ({
  id: row.id,
  username: row.username,
  bio: row.bio,
  avatarUrl: row.avatar_url,
  accent: toAccent(row.accent),
  background: row.background_url
    ? {
        url: row.background_url,
        gameId: row.background_game_id,
        position: row.background_position ?? DEFAULT_BACKGROUND_POSITION,
      }
    : null,
  // Opting out hides presence from everyone, the owner included.
  online: !row.hide_online && isOnline(row.last_seen_at, now),
  hideFromSearch: row.hide_from_search,
  profileVisibility: toProfileVisibility(row.profile_visibility),
  about: aboutFor(row, viewer),
  facts: factsFor(row, viewer, now),
  level: levelFor(row.xp ?? 0).level,
  frame: wornFrame(row.frame ?? null, levelFor(row.xp ?? 0).level),
  nameFont: row.name_font ?? "default",
  nameColour: row.name_colour ?? "default",
  pinnedLists: (row.pinned_lists ?? []).map(Number),
  pinnedReviews: (row.pinned_reviews ?? []).map(Number),
  sectionOrder: sectionOrder(row.section_order ?? []),
  // Left out, not blanked, where they keep it: the date itself is the secret.
  ...(canSeeProfile(aboutVisibilityOf(row).joined, viewer)
    ? { createdAt: row.created_at }
    : {}),
});

/** The same row for its owner, settings included. Only ever returned from a
 *  route that has established the caller is that owner. */
export const toMyProfile = (row: ProfileRow, now = Date.now()): MyProfile => ({
  ...toProfile(row, now, { isOwner: true, isFriend: false }),
  createdAt: row.created_at,
  firstName: row.first_name,
  birthDate: row.birth_date ?? null,
  aboutVisibility: aboutVisibilityOf(row),
  showSexualContent: row.show_sexual_content,
  adultConfirmedAt: row.adult_confirmed_at ?? null,
  timezone: row.timezone,
  hideOnline: row.hide_online,
  onboardedAt: row.onboarded_at,
  usernameChosenAt: row.username_chosen_at,
  isAdmin: row.is_admin,
  emailPrefs: resolveEmailPrefs(row.email_prefs),
});

/** A device that takes pushes, as the account export gives it. The keys
 *  and the endpoint's path are what let a push reach that device, and an
 *  export gets saved and passed around; the host still says which push
 *  service it is. */
export const toExportedPushDevice = (row: {
  endpoint: string;
  user_agent: string | null;
  created_at: string;
}) => ({
  endpoint_host: new URL(row.endpoint).host,
  user_agent: row.user_agent,
  created_at: row.created_at,
});

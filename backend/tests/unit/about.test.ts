import { describe, expect, it } from "vitest";
import { ageOn, BirthDateSchema, steamProfileUrl } from "@playrates/shared";
import {
  aboutFor,
  aboutNeedsFriendship,
  aboutVisibilityOf,
  factsFor,
  toProfile,
} from "../../src/modules/profiles/profiles.mapper.js";
import { buildProfile } from "../helpers/fixtures.js";

describe("steamProfileUrl", () => {
  it("keeps a profile's address, tidied", () => {
    expect(steamProfileUrl("https://steamcommunity.com/id/gaben/")).toBe(
      "https://steamcommunity.com/id/gaben",
    );
    expect(
      steamProfileUrl("steamcommunity.com/profiles/76561197960287930?l=en"),
    ).toBe("https://steamcommunity.com/profiles/76561197960287930");
  });

  it("makes an address from a custom name or a 17-digit id", () => {
    expect(steamProfileUrl("gaben")).toBe(
      "https://steamcommunity.com/id/gaben",
    );
    expect(steamProfileUrl("76561197960287930")).toBe(
      "https://steamcommunity.com/profiles/76561197960287930",
    );
  });

  it("refuses anything that would link somewhere else", () => {
    expect(steamProfileUrl("https://example.com/id/gaben")).toBeNull();
    expect(steamProfileUrl("javascript:alert(1)")).toBeNull();
    expect(
      steamProfileUrl("https://steamcommunity.com/profiles/123"),
    ).toBeNull();
    expect(steamProfileUrl("a")).toBeNull();
  });
});

describe("a profile's About fields", () => {
  const row = buildProfile({
    first_name: "Callum",
    pronouns: "he/him",
    location: "",
    discord: "callum",
    about_visibility: { discord: "friends" },
  });

  it("starts every field public, the first name too, and an age with friends", () => {
    expect(aboutVisibilityOf(row)).toEqual({
      firstName: "everyone",
      pronouns: "everyone",
      location: "everyone",
      website: "everyone",
      discord: "friends",
      steam: "everyone",
      age: "friends",
      joined: "everyone",
      lastSeen: "everyone",
    });
  });

  it("shows each viewer what its field's visibility allows, filled in only", () => {
    expect(aboutFor(row, { isOwner: false, isFriend: false })).toEqual({
      firstName: "Callum",
      pronouns: "he/him",
    });
    expect(aboutFor(row, { isOwner: false, isFriend: true })).toEqual({
      firstName: "Callum",
      pronouns: "he/him",
      discord: "callum",
    });
    expect(aboutFor(row, { isOwner: true, isFriend: false })).toEqual({
      firstName: "Callum",
      pronouns: "he/him",
      discord: "callum",
    });
  });

  it("reads a visibility it doesn't know as private", () => {
    const odd = buildProfile({
      pronouns: "they/them",
      about_visibility: { pronouns: "nobody" },
    });
    expect(aboutFor(odd, { isOwner: false, isFriend: true })).toEqual({});
  });

  it("asks about the friendship only when a field for friends is filled in", () => {
    expect(aboutNeedsFriendship(row)).toBe(true);
    expect(
      aboutNeedsFriendship(
        buildProfile({ about_visibility: { discord: "friends" } }),
      ),
    ).toBe(false);
  });
});

describe("a profile's facts", () => {
  const NOW = Date.parse("2026-11-06T12:00:00Z");
  const STRANGER = { isOwner: false, isFriend: false };
  const FRIEND = { isOwner: false, isFriend: true };
  const OWNER = { isOwner: true, isFriend: false };
  const row = buildProfile({
    birth_date: "1991-11-07",
    created_at: "2019-04-09T10:00:00Z",
    last_seen_at: "2026-11-05T23:30:00Z",
  });

  it("gives a stranger the join day and last seen day, but not an age", () => {
    expect(factsFor(row, STRANGER, NOW)).toEqual({
      joined: "2019-04-09T10:00:00Z",
      lastSeen: "2026-11-05",
    });
  });

  it("gives a friend the age, counted from the birthday, never the date", () => {
    expect(factsFor(row, FRIEND, NOW).age).toBe(34);
    expect(JSON.stringify(toProfile(row, NOW, FRIEND))).not.toContain("1991");
  });

  it("hides when they were last on along with whether they're on", () => {
    const hidden = buildProfile({ hide_online: true });
    expect(factsFor(hidden, OWNER, NOW).lastSeen).toBeUndefined();
  });

  it("leaves out when they joined, everywhere, where they keep it", () => {
    const kept = buildProfile({ about_visibility: { joined: "private" } });
    expect(toProfile(kept, NOW, STRANGER)).not.toHaveProperty("createdAt");
    expect(factsFor(kept, STRANGER, NOW).joined).toBeUndefined();
    expect(toProfile(kept, NOW, OWNER).createdAt).toBe(kept.created_at);
  });

  it("asks about the friendship for an age only once there's a birthday", () => {
    expect(aboutNeedsFriendship(buildProfile())).toBe(false);
    expect(
      aboutNeedsFriendship(buildProfile({ birth_date: "2000-01-01" })),
    ).toBe(true);
  });
});

describe("ageOn", () => {
  it("counts a birthday not reached yet this year as a year short", () => {
    expect(ageOn("2000-11-07", "2026-11-06")).toBe(25);
    expect(ageOn("2000-11-06", "2026-11-06")).toBe(26);
    expect(ageOn("2000-12-01", "2026-11-30")).toBe(25);
  });
});

describe("BirthDateSchema", () => {
  const yearsAgo = (years: number) => {
    const d = new Date();
    d.setUTCFullYear(d.getUTCFullYear() - years);
    return d.toISOString().slice(0, 10);
  };

  it("takes a birthday of 13 or over", () => {
    expect(BirthDateSchema.safeParse(yearsAgo(13)).success).toBe(true);
    expect(BirthDateSchema.safeParse("1991-04-09").success).toBe(true);
  });

  it("refuses someone under 13, a date that isn't one, and one too long ago", () => {
    expect(BirthDateSchema.safeParse(yearsAgo(12)).success).toBe(false);
    expect(BirthDateSchema.safeParse("2026-13-40").success).toBe(false);
    expect(BirthDateSchema.safeParse("1800-01-01").success).toBe(false);
    expect(BirthDateSchema.safeParse("9 April 1991").success).toBe(false);
  });
});

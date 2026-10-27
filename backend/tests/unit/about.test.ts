import { describe, expect, it } from "vitest";
import { steamProfileUrl } from "@playrates/shared";
import {
  aboutFor,
  aboutNeedsFriendship,
  aboutVisibilityOf,
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

  it("starts the first name hidden and the rest public", () => {
    expect(aboutVisibilityOf(row)).toEqual({
      firstName: "private",
      pronouns: "everyone",
      location: "everyone",
      website: "everyone",
      discord: "friends",
      steam: "everyone",
    });
  });

  it("shows each viewer what its field's visibility allows, filled in only", () => {
    expect(aboutFor(row, { isOwner: false, isFriend: false })).toEqual({
      pronouns: "he/him",
    });
    expect(aboutFor(row, { isOwner: false, isFriend: true })).toEqual({
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

import { describe, expect, it } from "vitest";
import {
  toExternalGame,
  type RawgGame,
} from "../../src/providers/games/rawg/rawg.mapper.js";

const rawgResponse: RawgGame = {
  id: 3328,
  slug: "the-witcher-3-wild-hunt",
  name: "The Witcher 3: Wild Hunt",
  description: "<p>An <b>open world</b> RPG.</p>",
  background_image: "https://media.rawg.io/media/games/witcher.jpg",
  released: "2015-05-18",
  esrb_rating: { id: 4, slug: "mature", name: "Mature" },
  rating: 4.66,
  ratings_count: 6532,
  playtime: 46,
  parent_platforms: [
    { platform: { id: 1, slug: "pc" } },
    { platform: { id: 2, slug: "playstation" } },
    { platform: { id: 3, slug: "xbox" } },
  ],
};

describe("RAWG mapper", () => {
  it("maps the core fields", () => {
    const game = toExternalGame(rawgResponse);

    expect(game.externalId).toBe(3328);
    expect(game.title).toBe("The Witcher 3: Wild Hunt");
    expect(game.releaseDate).toBe("2015-05-18");
    expect(game.coverUrl).toBe("https://media.rawg.io/media/games/witcher.jpg");
  });

  it("strips HTML out of the description", () => {
    const game = toExternalGame(rawgResponse);

    expect(game.description).toBe("An open world RPG.");
    expect(game.description).not.toContain("<");
  });

  it("prefers the plain-text description when present", () => {
    const game = toExternalGame({
      ...rawgResponse,
      description_raw: "Plain text version.",
    });

    expect(game.description).toBe("Plain text version.");
  });

  it("maps RAWG parent platforms onto PlayRates slugs", () => {
    const game = toExternalGame(rawgResponse);

    expect(game.platformSlugs).toEqual(["other-pc", "playstation", "xbox"]);
  });

  it("deduplicates platforms that collapse to the same slug", () => {
    const game = toExternalGame({
      ...rawgResponse,
      parent_platforms: [
        { platform: { id: 4, slug: "ios" } },
        { platform: { id: 8, slug: "android" } },
      ],
    });

    expect(game.platformSlugs).toEqual(["mobile"]);
  });

  it("drops platforms it has no mapping for", () => {
    const game = toExternalGame({
      ...rawgResponse,
      parent_platforms: [{ platform: { id: 999, slug: "atari" } }],
    });

    expect(game.platformSlugs).toEqual([]);
  });

  it("treats adults-only as sexual content", () => {
    expect(
      toExternalGame({
        ...rawgResponse,
        esrb_rating: { id: 5, slug: "adults-only", name: "Adults Only" },
      }).hasSexualContent,
    ).toBe(true);
  });

  /* Mature is the 17+ rating on most large releases. Treating it as sexual
     content hid Kingdom Come and The Witcher, which is the whole reason this
     stopped keying off ESRB alone. */
  it("does not treat mature as sexual content", () => {
    expect(
      toExternalGame({
        ...rawgResponse,
        esrb_rating: { id: 4, slug: "mature", name: "Mature" },
      }).hasSexualContent,
    ).toBe(false);
  });

  it("reads sexual content off RAWG's tags", () => {
    expect(
      toExternalGame({
        ...rawgResponse,
        esrb_rating: null,
        tags: [
          { id: 1, name: "Indie", slug: "indie" },
          { id: 2, name: "NSFW", slug: "nsfw" },
        ],
      }).hasSexualContent,
    ).toBe(true);
  });

  it("keeps the tag slugs, so the flag can be re-derived", () => {
    expect(
      toExternalGame({
        ...rawgResponse,
        tags: [{ id: 1, name: "Indie", slug: "indie" }],
      }).contentTags,
    ).toEqual(["indie"]);
  });

  it("treats other ratings, and no rating, as not sexual content", () => {
    expect(
      toExternalGame({
        ...rawgResponse,
        esrb_rating: { id: 3, slug: "teen", name: "Teen" },
      }).hasSexualContent,
    ).toBe(false);
    expect(
      toExternalGame({ ...rawgResponse, esrb_rating: null }).hasSexualContent,
    ).toBe(false);
  });

  it("normalises an empty release date to null", () => {
    // RAWG returns "" rather than null for unreleased titles
    const game = toExternalGame({ ...rawgResponse, released: "" });

    expect(game.releaseDate).toBeNull();
  });

  it("maps playtime onto playtimeHours", () => {
    expect(toExternalGame(rawgResponse).playtimeHours).toBe(46);
    expect(
      toExternalGame({ ...rawgResponse, playtime: 0 }).playtimeHours,
    ).toBeNull();
  });
});

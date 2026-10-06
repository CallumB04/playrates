import { describe, expect, it } from "vitest";
import {
  igdbImage,
  pickBanner,
  toExternalGame,
  type IgdbGame,
} from "../../src/providers/games/igdb/igdb.mapper.js";

/** Close to what IGDB sends for The Witcher 3, trimmed to what is mapped. */
const witcher: IgdbGame = {
  id: 1942,
  name: "The Witcher 3: Wild Hunt",
  slug: "the-witcher-3-wild-hunt",
  summary: "  RPG and sequel to The Witcher 2.  ",
  storyline: "Geralt searches for Ciri.",
  first_release_date: 1431993600,
  cover: { image_id: "co1wyy" },
  artworks: [{ image_id: "ar5ma" }],
  screenshots: [{ image_id: "sc1" }],
  platforms: [6, 48, 49, 130, 167, 169],
  genres: [
    { slug: "role-playing-rpg", name: "Role-playing (RPG)" },
    { slug: "adventure", name: "Adventure" },
  ],
  themes: [1, 17],
  involved_companies: [
    { company: { name: "CD Projekt RED" }, developer: true, publisher: false },
    { company: { name: "CD Projekt" }, developer: false, publisher: true },
    { company: { name: "Warner Bros." }, developer: false, publisher: true },
  ],
  websites: [
    { url: "https://store.steampowered.com/app/292030", type: 13 },
    { url: "https://thewitcher.com/en/witcher3", type: 1 },
  ],
  external_games: [{ external_game_source: 1 }],
  age_ratings: [
    { organization: 2, rating_category: { rating: "18" } },
    { organization: 1, rating_category: { rating: "M" } },
  ],
  aggregated_rating: 92.6,
  total_rating_count: 4100,
};

describe("toExternalGame", () => {
  it("maps the core fields", () => {
    expect(toExternalGame(witcher)).toMatchObject({
      externalId: 1942,
      slug: "the-witcher-3-wild-hunt",
      title: "The Witcher 3: Wild Hunt",
      description: "RPG and sequel to The Witcher 2.",
      releaseDate: "2015-05-19",
      developers: ["CD Projekt RED"],
      publishers: ["CD Projekt", "Warner Bros."],
      website: "https://thewitcher.com/en/witcher3",
      esrbRating: "Mature",
      criticScore: 93,
      igdbRatingCount: 4100,
      hasSexualContent: false,
    });
  });

  it("puts the portrait cover on tiles and wide art on previews", () => {
    const game = toExternalGame(witcher);
    expect(game.boxArtUrl).toBe(igdbImage("co1wyy", "cover_big_2x"));
    expect(game.coverUrl).toBe(igdbImage("ar5ma", "1080p"));
    expect(game.boxArtUrl).toBe(
      "https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co1wyy.jpg",
    );
  });

  it("falls back to a screenshot, then to the cover, for the wide art", () => {
    expect(toExternalGame({ ...witcher, artworks: [] }).coverUrl).toBe(
      igdbImage("sc1", "1080p"),
    );
    expect(
      toExternalGame({ ...witcher, artworks: undefined, screenshots: undefined })
        .coverUrl,
    ).toBe(igdbImage("co1wyy", "cover_big_2x"));
  });

  it("uses the storyline when there is no summary, and empty when neither", () => {
    expect(
      toExternalGame({ ...witcher, summary: undefined }).description,
    ).toBe("Geralt searches for Ciri.");
    expect(
      toExternalGame({ ...witcher, summary: undefined, storyline: undefined })
        .description,
    ).toBe("");
  });

  it("maps machines onto PlayRates' own systems and families", () => {
    const game = toExternalGame(witcher);
    expect(game.systemSlugs).toEqual([
      "steam",
      "playstation4",
      "xbox-one",
      "nintendo-switch",
      "playstation5",
      "xbox-series-x",
    ]);
    expect(game.platformSlugs).toEqual([
      "steam",
      "playstation",
      "xbox",
      "nintendo-switch",
    ]);
  });

  it("counts a PC game not on Steam as plain PC", () => {
    const game = toExternalGame({
      ...witcher,
      platforms: [6],
      external_games: [{ external_game_source: 5 }],
    });
    expect(game.systemSlugs).toEqual(["other-pc"]);
    expect(game.platformSlugs).toEqual(["other-pc"]);
  });

  it("skips machines PlayRates has no place for", () => {
    expect(toExternalGame({ ...witcher, platforms: [9999] }).systemSlugs).toEqual(
      [],
    );
  });

  it("keeps IGDB's genres as they are", () => {
    expect(toExternalGame(witcher).genres).toEqual([
      { slug: "role-playing-rpg", name: "Role-playing (RPG)" },
      { slug: "adventure", name: "Adventure" },
    ]);
  });

  it("writes the ESRB rating out in words, and ignores other boards", () => {
    const rated = (rating: string) =>
      toExternalGame({
        ...witcher,
        age_ratings: [{ organization: 1, rating_category: { rating } }],
      }).esrbRating;
    expect(rated("E10+")).toBe("Everyone 10+");
    expect(rated("E")).toBe("Everyone");
    expect(rated("AO")).toBe("Adults Only");
    expect(
      toExternalGame({
        ...witcher,
        age_ratings: [{ organization: 2, rating_category: { rating: "18" } }],
      }).esrbRating,
    ).toBeNull();
  });

  it("flags a game with IGDB's Erotic theme", () => {
    expect(
      toExternalGame({ ...witcher, themes: [42] }).hasSexualContent,
    ).toBe(true);
  });

  it("flags a game whose title says what it is, and not a carved-out one", () => {
    expect(
      toExternalGame({ ...witcher, name: "Hentai Girl", themes: [] })
        .hasSexualContent,
    ).toBe(true);
    expect(
      toExternalGame({ ...witcher, name: "The Sexy Brutale", themes: [] })
        .hasSexualContent,
    ).toBe(false);
    expect(
      toExternalGame({ ...witcher, name: "Sussex Detective", themes: [] })
        .hasSexualContent,
    ).toBe(false);
  });

  /* Ocarina of Time's first collection is "Ocarina of Time", which kept
     it out of every other Zelda game's row. */
  it("groups by the franchise over a narrower collection", () => {
    expect(
      toExternalGame({
        ...witcher,
        collections: [{ id: 8993, name: "The Legend of Zelda: Ocarina of Time" }],
        franchises: [{ id: 596, name: "The Legend of Zelda" }],
      }).series,
    ).toEqual({ id: -596, name: "The Legend of Zelda" });
  });

  it("falls back to a collection, kept apart from franchises by sign", () => {
    expect(
      toExternalGame({ ...witcher, collections: [{ id: 62, name: "The Witcher" }] })
        .series,
    ).toEqual({ id: 62, name: "The Witcher" });
    expect(toExternalGame(witcher).series).toBeNull();
  });

  it("keeps IGDB's similar games by id", () => {
    expect(
      toExternalGame({ ...witcher, similar_games: [1887, 3025] }).similarIds,
    ).toEqual([1887, 3025]);
  });

  it("lists edition covers before regional ones, without the main cover, four at most", () => {
    const game = toExternalGame(
      {
        ...witcher,
        game_localizations: [
          { cover: { image_id: "jp" }, region: { name: "Japan" } },
          { region: { name: "Korea" } },
          { cover: { image_id: "co1wyy" }, region: { name: "Europe" } },
        ],
      },
      [
        { imageId: "e1", label: "Complete Edition" },
        { imageId: "e2", label: "Collector's Edition" },
        { imageId: "e1", label: "Complete Edition" },
        { imageId: "e3", label: "GOTY" },
        { imageId: "e4", label: "Deluxe" },
      ],
    );
    expect(game.altCovers).toEqual([
      { imageId: "e1", label: "Complete Edition" },
      { imageId: "e2", label: "Collector's Edition" },
      { imageId: "e3", label: "GOTY" },
      { imageId: "e4", label: "Deluxe" },
    ]);
    expect(
      toExternalGame({
        ...witcher,
        game_localizations: [{ cover: { image_id: "jp" }, region: { name: "Japan" } }],
      }).altCovers,
    ).toEqual([{ imageId: "jp", label: "Japan" }]);
  });

  it("leaves out what IGDB left out", () => {
    const bare = toExternalGame({ id: 1, name: "Bare", slug: "bare" });
    expect(bare).toMatchObject({
      description: "",
      coverUrl: null,
      boxArtUrl: null,
      releaseDate: null,
      platformSlugs: [],
      systemSlugs: [],
      genres: [],
      developers: [],
      publishers: [],
      website: null,
      esrbRating: null,
      criticScore: null,
      igdbRatingCount: null,
    });
  });
});

describe("pickBanner", () => {
  const shot = { image_id: "sc1" };
  const art = { image_id: "ar1" };

  /* The first artwork is often the logo: The Witcher 3's claws, GTA V's
     wordmark. A screenshot is the game itself. */
  it("takes a screenshot over artwork", () => {
    expect(pickBanner({ artworks: [art], screenshots: [shot] })).toBe(
      "https://images.igdb.com/igdb/image/upload/t_1080p/sc1.jpg",
    );
  });

  it("falls back to artwork, then to nothing", () => {
    expect(pickBanner({ artworks: [art] })).toContain("/ar1.jpg");
    expect(pickBanner({})).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import {
  htmlToText,
  isRawgBoilerplate,
  toDescription,
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

  describe("the description", () => {
    const describedBy = (fields: Partial<RawgGame>) =>
      toExternalGame({ ...rawgResponse, description: undefined, ...fields })
        .description;

    /* The paragraphs are RAWG's own, and collapsing whitespace wholesale threw
       every one of them away across the whole catalogue. */
    it("keeps the paragraphs the plain text came with", () => {
      expect(
        describedBy({
          description_raw: "First paragraph.\n\nSecond paragraph.",
        }),
      ).toBe("First paragraph.\n\nSecond paragraph.");
    });

    it("still collapses the runs of spaces inside a paragraph", () => {
      expect(
        describedBy({ description_raw: "Too    many\t\tspaces here." }),
      ).toBe("Too many spaces here.");
    });

    it("trims a run of blank lines down to one break", () => {
      expect(describedBy({ description_raw: "One.\n\n\n\n\nTwo." })).toBe(
        "One.\n\nTwo.",
      );
    });

    it("turns block tags into the breaks they stand for", () => {
      expect(
        describedBy({
          description_raw: undefined,
          description: "<p>First.</p><p>Second.</p>",
        }),
      ).toBe("First.\n\nSecond.");
    });

    it("decodes the entities RAWG leaves in its HTML", () => {
      expect(
        describedBy({
          description_raw: undefined,
          description: "<p>Valve&#39;s puzzler &amp; its sequel</p>",
        }),
      ).toBe("Valve's puzzler & its sequel");
    });

    /* Some upstream sources arrive already flattened; where the HTML still
       has its blocks, it is the better of the two. */
    it("prefers the HTML when the plain text has lost its breaks", () => {
      expect(
        describedBy({
          description_raw: "All one line. No breaks at all.",
          description: "<p>All one line.</p><p>No breaks at all.</p>",
        }),
      ).toBe("All one line.\n\nNo breaks at all.");
    });

    it("keeps the plain text when it is the one with the breaks", () => {
      expect(
        describedBy({
          description_raw: "Proper.\n\nParagraphs.",
          description: "<p>Proper. Paragraphs.</p>",
        }),
      ).toBe("Proper.\n\nParagraphs.");
    });

    /* "...the world.We're working" — a lost break, not a sentence. */
    it("parts sentences that ran into each other", () => {
      expect(
        describedBy({ description_raw: "Reclaim the world.We're working on it." }),
      ).toBe("Reclaim the world. We're working on it.");
    });

    it("leaves abbreviations and decimals alone", () => {
      expect(
        describedBy({ description_raw: "Rated 8.5 by e.g.Someone U.S.A wide." }),
      ).toBe("Rated 8.5 by e.g.Someone U.S.A wide.");
    });

    it("has nothing to say about a game with no description", () => {
      expect(describedBy({ description_raw: undefined })).toBe("");
    });
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
      parent_platforms: [{ platform: { id: 999, slug: "unknowable" } }],
    });

    expect(game.platformSlugs).toEqual([]);
  });

  it("reads the individual machines, and the family each rolls up into", () => {
    const game = toExternalGame({
      ...rawgResponse,
      platforms: [
        { platform: { id: 187, slug: "playstation5" } },
        { platform: { id: 18, slug: "playstation4" } },
        { platform: { id: 186, slug: "xbox-series-x" } },
      ],
      parent_platforms: [
        { platform: { id: 2, slug: "playstation" } },
        { platform: { id: 3, slug: "xbox" } },
      ],
    });

    expect(game.systemSlugs).toEqual([
      "playstation5",
      "playstation4",
      "xbox-series-x",
    ]);
    expect(game.platformSlugs).toEqual(["playstation", "xbox"]);
  });

  /* Every Nintendo machine shares one parent id, which is how the whole
     catalogue came to claim NES titles were on the Switch. */
  it("keeps the Switch apart from the older Nintendo consoles", () => {
    const retro = toExternalGame({
      ...rawgResponse,
      platforms: [
        { platform: { id: 49, slug: "nes" } },
        { platform: { id: 83, slug: "snes" } },
      ],
      parent_platforms: [{ platform: { id: 7, slug: "nintendo" } }],
    });

    expect(retro.platformSlugs).toEqual(["nintendo"]);
    expect(retro.systemSlugs).toEqual(["nes", "snes"]);

    const modern = toExternalGame({
      ...rawgResponse,
      platforms: [{ platform: { id: 7, slug: "nintendo-switch" } }],
      parent_platforms: [{ platform: { id: 7, slug: "nintendo" } }],
    });

    expect(modern.platformSlugs).toEqual(["nintendo-switch"]);
  });

  it("keeps the makers it used to drop on the floor", () => {
    const game = toExternalGame({
      ...rawgResponse,
      platforms: [
        { platform: { id: 5, slug: "macos" } },
        { platform: { id: 6, slug: "linux" } },
        { platform: { id: 167, slug: "genesis" } },
        { platform: { id: 23, slug: "atari-2600" } },
        { platform: { id: 171, slug: "web" } },
      ],
      parent_platforms: [],
    });

    expect(game.platformSlugs).toEqual([
      "mac",
      "linux",
      "sega",
      "atari",
      "web",
    ]);
  });

  it("splits iOS and Android apart while keeping one mobile family", () => {
    const game = toExternalGame({
      ...rawgResponse,
      platforms: [
        { platform: { id: 3, slug: "ios" } },
        { platform: { id: 21, slug: "android" } },
      ],
      parent_platforms: [],
    });

    expect(game.platformSlugs).toEqual(["mobile"]);
    expect(game.systemSlugs).toEqual(["ios", "android"]);
  });

  /* RAWG has no "Steam" platform — it is a store — so the storefront stands in
     as the machine for a PC game. */
  it("sends a PC game to the storefront it is sold on", () => {
    const onSteam = toExternalGame({
      ...rawgResponse,
      platforms: [{ platform: { id: 4, slug: "pc" } }],
      parent_platforms: [{ platform: { id: 1, slug: "pc" } }],
      stores: [{ store: { id: 1, slug: "steam" } }],
    });

    expect(onSteam.platformSlugs).toEqual(["steam"]);
    expect(onSteam.systemSlugs).toEqual(["steam"]);

    const elsewhere = toExternalGame({
      ...rawgResponse,
      platforms: [{ platform: { id: 4, slug: "pc" } }],
      parent_platforms: [{ platform: { id: 1, slug: "pc" } }],
      stores: [{ store: { id: 11, slug: "epic-games" } }],
    });

    expect(elsewhere.platformSlugs).toEqual(["other-pc"]);
  });

  /* A console RAWG adds after this map was written must not take the game's
     whole platform away with it. */
  it("falls back to the family for a machine it has never seen", () => {
    const game = toExternalGame({
      ...rawgResponse,
      platforms: [{ platform: { id: 900, slug: "playstation6" } }],
      parent_platforms: [{ platform: { id: 2, slug: "playstation" } }],
    });

    expect(game.platformSlugs).toEqual(["playstation"]);
    expect(game.systemSlugs).toEqual([]);
  });

  /* None of these are in a listing row, so the fields have to survive being
     absent as well as present. */
  it("reads the credits the detail endpoint adds", () => {
    const game = toExternalGame({
      ...rawgResponse,
      developers: [{ id: 1, name: "CD PROJEKT RED", slug: "cd-projekt-red" }],
      publishers: [{ id: 2, name: "CD PROJEKT", slug: "cd-projekt" }],
      website: "https://thewitcher.com/en/witcher3",
      esrb_rating: { id: 4, slug: "mature", name: "Mature" },
    });

    expect(game.developers).toEqual(["CD PROJEKT RED"]);
    expect(game.publishers).toEqual(["CD PROJEKT"]);
    expect(game.website).toBe("https://thewitcher.com/en/witcher3");
    expect(game.esrbRating).toBe("Mature");
  });

  /* A listing row has the age rating but no credits, which is why the import
     fills one of the four and the first view fills the rest. */
  it("takes the age rating from a listing row, and no credits", () => {
    const game = toExternalGame(rawgResponse);

    expect(game.esrbRating).toBe("Mature");
    expect(game.developers).toEqual([]);
    expect(game.publishers).toEqual([]);
    expect(game.website).toBeNull();
  });

  it("copes with a game carrying no age rating at all", () => {
    expect(
      toExternalGame({ ...rawgResponse, esrb_rating: null }).esrbRating,
    ).toBeNull();
  });

  /* RAWG sends "" rather than null for a game with no site of its own, and an
     empty string would pass the column's https check by being absent. */
  it("treats an empty website as no website", () => {
    expect(toExternalGame({ ...rawgResponse, website: "" }).website).toBeNull();
  });

  /* RAWG's age ratings are contributed, and it has Kingdom Come: Deliverance
     II as Adults Only — it is an M-rated RPG. Across the catalogue the rating
     caught nothing a tag or a title did not, bar two games it got wrong. */
  it("does not hide a game for its age rating alone", () => {
    expect(
      toExternalGame({
        ...rawgResponse,
        name: "Kingdom Come: Deliverance II",
        esrb_rating: { id: 5, slug: "adults-only", name: "Adults Only" },
        tags: [{ id: 1, name: "RPG", slug: "rpg" }],
      }).hasSexualContent,
    ).toBe(false);
  });

  it("still hides an adults-only game its tags name as such", () => {
    expect(
      toExternalGame({
        ...rawgResponse,
        esrb_rating: { id: 5, slug: "adults-only", name: "Adults Only" },
        tags: [{ id: 1, name: "Hentai", slug: "hentai" }],
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

  /* dating-sim is a genre. RAWG hangs it on anything with romance in it, and
     it had Stardew Valley behind the filter along with a thousand others. */
  it("does not treat dating-sim as sexual content", () => {
    expect(
      toExternalGame({
        ...rawgResponse,
        esrb_rating: null,
        tags: [
          { id: 1, name: "Indie", slug: "indie" },
          { id: 2, name: "Dating Sim", slug: "dating-sim" },
        ],
      }).hasSexualContent,
    ).toBe(false);
  });

  /* A dating sim that is explicit says so with a tag of its own. */
  it("still flags a dating sim that carries an explicit tag", () => {
    expect(
      toExternalGame({
        ...rawgResponse,
        esrb_rating: null,
        tags: [
          { id: 1, name: "Dating Sim", slug: "dating-sim" },
          { id: 2, name: "Eroge", slug: "eroge" },
        ],
      }).hasSexualContent,
    ).toBe(true);
  });

  /* The filter is for games that are pornography, not games with a scene in
     them. RAWG puts "sexual-content" on 4,880 games including Halo Infinite
     and Red Dead Redemption, and an M rating already tells a parent that. */
  it("does not treat a sex scene as sexual content", () => {
    expect(
      toExternalGame({
        ...rawgResponse,
        name: "Red Dead Redemption",
        esrb_rating: { id: 4, slug: "mature", name: "Mature" },
        tags: [
          { id: 1, name: "Open World", slug: "open-world" },
          { id: 2, name: "Sexual Content", slug: "sexual-content" },
        ],
      }).hasSexualContent,
    ).toBe(false);
  });

  /* A handful of games the rules get wrong, checked by hand. Worth more than
     a weaker rule, which would let real ones through. */
  it("lets a checked exception through whatever the rules say", () => {
    expect(
      toExternalGame({
        ...rawgResponse,
        name: "The Sexy Brutale",
        esrb_rating: null,
        tags: [],
      }).hasSexualContent,
    ).toBe(false);

    expect(
      toExternalGame({
        ...rawgResponse,
        name: "Dream Daddy: A Dad Dating Simulator",
        esrb_rating: null,
        tags: [{ id: 1, name: "Adult", slug: "adult" }],
      }).hasSexualContent,
    ).toBe(false);
  });

  /* RAWG's tags are contributed, not curated. A fifth of the games with
     "Hentai" in the name carried no tag that marked them, and search handed
     them to everyone. */
  it("reads an untagged title that says what it is", () => {
    for (const name of [
      "Hentai Girl",
      "3D Hentai Blackjack",
      "Sex with a Vampire",
      "MILKY BOOBS",
      "Futanari Affairs",
      "Porntris",
      "Softporn Adventure",
      "Boobserman",
      "Magical MILFs",
      "Lula: The Sexy Empire",
      "Lewd Beach",
    ]) {
      expect(
        toExternalGame({ ...rawgResponse, name, esrb_rating: null, tags: [] })
          .hasSexualContent,
      ).toBe(true);
    }
  });

  /* The stems still start a word, so a county is a county. */
  it("does not read it into a title that merely contains the letters", () => {
    for (const name of [
      "Essex Rally",
      "Middlesex United",
      "Nudge the Box",
      "Sussex Farming Simulator",
      "Milford Heaven - Luken's Chronicles",
      "Asterix & Obelix XXXL: The Ram From Hibernia",
    ]) {
      expect(
        toExternalGame({ ...rawgResponse, name, esrb_rating: null, tags: [] })
          .hasSexualContent,
      ).toBe(false);
    }
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

  it("maps genres to slug and name pairs", () => {
    const game = toExternalGame({
      ...rawgResponse,
      genres: [
        { id: 4, slug: "action", name: "Action" },
        { id: 5, slug: "rpg", name: "RPG" },
      ],
    });

    expect(game.genres).toEqual([
      { slug: "action", name: "Action" },
      { slug: "rpg", name: "RPG" },
    ]);
  });

  it("copes with a listing row that carries none of the optional fields", () => {
    const game = toExternalGame({
      id: 1,
      slug: "bare",
      name: "Bare",
    });

    expect(game).toMatchObject({
      externalId: 1,
      description: "",
      coverUrl: null,
      releaseDate: null,
      platformSlugs: [],
      systemSlugs: [],
      genres: [],
      developers: [],
      publishers: [],
      website: null,
      esrbRating: null,
      contentTags: [],
      hasSexualContent: false,
      metacritic: null,
      rawgRating: null,
      rawgRatingCount: null,
      rawgAddedCount: null,
      playtimeHours: null,
    });
  });

  it("carries the external figures through under their own names", () => {
    const game = toExternalGame({ ...rawgResponse, metacritic: 92, added: 21 });

    expect(game.metacritic).toBe(92);
    expect(game.rawgRating).toBe(4.66);
    expect(game.rawgRatingCount).toBe(6532);
    expect(game.rawgAddedCount).toBe(21);
  });

  it("leaves a description of only markup empty rather than whitespace", () => {
    const game = toExternalGame({ ...rawgResponse, description: "<p></p>" });
    expect(game.description).toBe("");
  });
});

describe("htmlToText", () => {
  /* Steam's markup: a <p> per paragraph, an <h2> per heading, video between. */
  it("keeps a store page's paragraphs and headings apart", () => {
    const html =
      '<p class="bb_paragraph">Welcome aboard, roving voyager.</p>' +
      '<p class="bb_paragraph"><span class="bb_img_ctn"><video class="bb_img" autoplay>' +
      '<source src="https://x.test/a.webm" type="video/webm"></video></span></p>' +
      '<h2 class="bb_tag">Delve into an expansive world</h2>' +
      '<p class="bb_paragraph">Embrace high degrees of freedom.</p>';

    expect(htmlToText(html)).toBe(
      "Welcome aboard, roving voyager.\n\n" +
        "Delve into an expansive world\n\n" +
        "Embrace high degrees of freedom.",
    );
  });

  it("keeps a list as a list, one item a line", () => {
    const html =
      "<p>Features:</p><ul class=\"bb_ul\"><li>Flight</li><li>Grapple</li></ul><p>And more.</p>";

    expect(htmlToText(html)).toBe(
      "Features:\n\n• Flight\n• Grapple\n\nAnd more.",
    );
  });

  /* Elden Ring's: italic text, then a heading, with no closing block tag
     between them — so the heading ran onto the end of the sentence. */
  it("starts a heading on its own line even after inline text", () => {
    expect(
      htmlToText(
        "<i>The power of the Elden Ring.</i><h2>• A Breathtaking World</h2>The Lands Between.",
      ),
    ).toBe(
      "The power of the Elden Ring.\n\n• A Breathtaking World\n\nThe Lands Between.",
    );
  });

  it("does not take a <pre> for a paragraph", () => {
    expect(htmlToText("<pre>a</pre>")).toBe("a");
  });

  it("does not take a <link> for a list item", () => {
    expect(htmlToText('<link rel="x"><p>Just prose.</p>')).toBe("Just prose.");
  });
});

/* All three are RAWG's own words, written for games with no description of
   their own, and taken from our catalogue as they arrived. */
describe("RAWG's generated descriptions", () => {
  const generated = {
    "Donkey Kong Bananza":
      'Donkey Kong Bananza is an adventure game. It came out on 17-07-2025. Most rawgers rated the game as "Exceptional".\nDonkey Kong Bananza is available on Nintendo Switch. You can purchase the game on Nintendo eShop.',
    "Warcraft 2: Beyond the Dark Portal":
      'Warcraft 2: Beyond the Dark Portal is a strategy game developed by Cyberlore Studios. It was originally released in 1996. It was published by Blizzard Entertainment. Most rawgers rated the game as "Recommended".\nWarcraft 2: Beyond the Dark Portal is available on PlayStation and PC.',
    "Elden Ring - The Unalloyed Dream":
      'Elden Ring - The Unalloyed Dream is a RPG game developed by Speedius678. It came out on 05-10-2022. The game is rated as "Skip" on RAWG.\nYou can play Elden Ring - The Unalloyed Dream on macOS and PC. The game is sold via itch.io.',
  };

  for (const [name, text] of Object.entries(generated)) {
    it(`leaves ${name} with no description rather than RAWG's`, () => {
      expect(
        toDescription({ id: 1, slug: "x", name, description_raw: text }),
      ).toBe("");
    });
  }

  it("keeps a developer whose name carries a full stop", () => {
    expect(
      isRawgBoilerplate(
        "Mario Kart World is a racing game developed by Nintendo Co., Ltd. It came out on 05-06-2025.",
      ),
    ).toBe(true);
  });

  /* The rule is every sentence, not any sentence: prose that opens the way
     the template does is still prose. */
  it("keeps a real description that opens the way the template does", () => {
    const real =
      "Hades is a rogue-like dungeon crawler game. Defy the god of the dead as you hack and slash out of the Underworld.";

    expect(isRawgBoilerplate(real)).toBe(false);
    expect(
      toDescription({ id: 1, slug: "hades", name: "Hades", description_raw: real }),
    ).toBe(real);
  });

  it("treats an empty description as nothing to strip", () => {
    expect(isRawgBoilerplate("")).toBe(false);
  });
});

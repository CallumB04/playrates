import { describe, expect, it } from "vitest";
import { searchKey } from "../../src/lib/searchKey.js";

describe("searchKey", () => {
  /* The same strings were checked against public.search_key in the
     database; the two have to agree or a search misses. */
  it.each([
    ["The Witcher 3: Wild Hunt", "thewitcher3wildhunt"],
    ["Pokémon Legends: Arceus", "pokemonlegendsarceus"],
    ["Marvel's Spider-Man", "marvelsspiderman"],
    ["Final Fantasy VII Remake", "finalfantasy7remake"],
    ["Grand Theft Auto V", "grandtheftauto5"],
  ])("keys %s as the database does", (title, key) => {
    expect(searchKey(title)).toBe(key);
  });

  it("matches what people type to the titles they mean", () => {
    expect(searchKey("The Witcher 3: Wild Hunt")).toContain(
      searchKey("witcher iii"),
    );
    expect(searchKey("Pokémon Legends: Arceus")).toContain(searchKey("pokemon"));
    expect(searchKey("Marvel's Spider-Man")).toContain(searchKey("spider man"));
  });

  it("spells out letters accents alone don't cover", () => {
    expect(searchKey("Æon Flux")).toBe("aeonflux");
  });

  it("leaves nothing to match when there's nothing but punctuation", () => {
    expect(searchKey("!!!")).toBe("");
  });
});

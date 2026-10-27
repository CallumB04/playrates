import { describe, expect, it } from "vitest";
import { altKeys, matchTier } from "../../src/lib/gameMatch.js";

const gtaV = {
  title: "Grand Theft Auto V",
  altNames: ["GTA V", "GTA5", "Grand Theft Auto 5", "俠盜獵車手 5"],
};
const witcher = { title: "The Witcher 3: Wild Hunt", altNames: ["TW3"] };

describe("matchTier", () => {
  it("ranks the title itself first", () => {
    expect(matchTier({ title: "Portal", altNames: [] }, "portal")).toBe(0);
    expect(matchTier({ title: "Portal 2", altNames: [] }, "portal")).toBe(1);
  });

  it("finds a game by one of its other names", () => {
    expect(matchTier(gtaV, "gta 5")).toBe(0);
    expect(matchTier(gtaV, "GTA")).toBe(1);
    expect(matchTier(witcher, "tw3")).toBe(0);
  });

  /* Titles are matched with their spaces out, so "spiderman" finds
     "Spider-Man"; but a match across a word break is a weaker one. */
  it("ranks a match from the start of a word above one across a break", () => {
    expect(matchTier(witcher, "witcher")).toBe(1);
    expect(matchTier({ title: "Witch Rise", altNames: [] }, "witchr")).toBe(2);
    expect(
      matchTier({ title: "Marvel's Spider-Man", altNames: [] }, "spiderman"),
    ).toBe(2);
  });

  it("finds every word of a query in any order", () => {
    expect(matchTier(witcher, "wild hunt witcher")).toBe(2);
    expect(matchTier(witcher, "witcher iii")).toBe(1);
  });

  it("wants every word, not just some", () => {
    expect(matchTier(witcher, "witcher geralt")).toBeNull();
  });

  it("matches one or two characters from the start of the title only", () => {
    expect(matchTier(gtaV, "gr")).toBe(1);
    expect(matchTier(gtaV, "gt")).toBeNull();
  });

  it("falls back to the title as typed for nothing but punctuation", () => {
    expect(matchTier({ title: "...And Justice", altNames: [] }, "...")).toBe(1);
    expect(matchTier(witcher, "...")).toBeNull();
  });
});

describe("altKeys", () => {
  /* "俠盜獵車手 5" keys to "5", which would match every query with a five
     in it; nothing under three characters is kept. */
  it("drops what is left of a name in another script, and the title", () => {
    expect(altKeys(gtaV.altNames, "grandtheftauto5")).toEqual(["gta5"]);
  });
});

import { matchesFromStart, searchKey, searchWords } from "./searchKey.js";

/**
 * The kind of match a game is for a search:
 *   0  its title, or one of its other names, is the query
 *   1  the query, from the start of a word of the title, or of a name
 *   2  the query across a word break ("witchr" in "Witch Rise"), or every
 *      word of it in any order
 * public.search_games returns the same, ranks 2 alongside its typo matches
 * (3, which only the database can find) by popularity, and the library
 * filters by them. These are the same rules, for the tests and in-memory
 * repositories.
 */
export type MatchTier = 0 | 1 | 2;

/** A game's other names as search_alt keeps them: keys of three characters
 *  or more, since a shorter one is what's left of a name in another script,
 *  and none that only repeats the title. */
export const altKeys = (altNames: string[], titleKey: string): string[] => [
  ...new Set(
    altNames
      .map(searchKey)
      .filter((key) => key.length >= 3 && key !== titleKey),
  ),
];

export const matchTier = (
  game: { title: string; altNames: string[] },
  term: string,
): MatchTier | null => {
  const words = searchWords(term);
  const key = words.join("");
  const titleKey = searchKey(game.title);

  // Nothing but punctuation has no key: the title as typed.
  if (!key) {
    return game.title.toLowerCase().includes(term.toLowerCase()) ? 1 : null;
  }
  if (matchesFromStart(key)) {
    if (titleKey === key) return 0;
    return titleKey.startsWith(key) ? 1 : null;
  }

  const alts = altKeys(game.altNames, titleKey);
  if (titleKey === key || alts.includes(key)) return 0;

  const titleText = ` ${searchWords(game.title).join(" ")}`;
  if (
    titleText.includes(` ${words.join(" ")}`) ||
    alts.some((alt) => alt.startsWith(key))
  ) {
    return 1;
  }
  if (titleKey.includes(key) || alts.some((alt) => alt.includes(key))) {
    return 2;
  }
  if (words.length > 1 && words.every((word) => titleKey.includes(word))) {
    return 2;
  }
  return null;
};

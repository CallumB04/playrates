const ROMAN: Record<string, string> = {
  i: "1",
  ii: "2",
  iii: "3",
  iv: "4",
  v: "5",
  vi: "6",
  vii: "7",
  viii: "8",
  ix: "9",
  x: "10",
};

/* Letters NFD leaves whole, which Postgres's unaccent spells out. */
const SPELLED: Record<string, string> = {
  æ: "ae",
  œ: "oe",
  ø: "o",
  ß: "ss",
  đ: "d",
  ł: "l",
  þ: "th",
};

/**
 * The words a title or query is matched on: no accents or punctuation,
 * roman numerals as digits. Must agree with public.search_words.
 */
export const searchWords = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[æœøßđłþ]/g, (c) => SPELLED[c]!)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter((word) => word !== "")
    .map((word) => ROMAN[word] ?? word);

/**
 * What a title is matched on: its words run together, so "witcher iii" finds
 * "The Witcher 3" and "pokemon" finds "Pokémon". Must agree with
 * public.search_key in the database, which builds the same key for every
 * title.
 */
export const searchKey = (text: string): string => searchWords(text).join("");

/**
 * Below three characters a title search matches from the start of the title.
 * A contains-match needs trigrams, and one or two characters make none, so
 * the database read all hundred thousand titles for it, and timed out. Two
 * letters are almost always the start of a word still being typed; the third
 * brings back matching anywhere.
 */
export const SUBSTRING_MATCH_FROM = 3;

export const matchesFromStart = (key: string): boolean =>
  key.length < SUBSTRING_MATCH_FROM;

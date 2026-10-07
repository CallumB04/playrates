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
 * What a title is matched on: no accents, no punctuation or spaces, roman
 * numerals as digits, so "witcher iii" finds "The Witcher 3" and "pokemon"
 * finds "Pokémon". Must agree with public.search_key in the database, which
 * builds the same key for every title.
 */
export const searchKey = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[æœøßđłþ]/g, (c) => SPELLED[c]!)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .map((word) => ROMAN[word] ?? word)
    .join("");

/**
 * Games the title rule gets wrong, checked by hand.
 *
 * Each is here because a word in its title says something the game does not:
 * The Sexy Brutale is a puzzle game, Dream Daddy is wholesome, Ghost Master
 * is from 2003. A short list of names is worth more than a weaker rule,
 * which would let real ones through.
 */
const NOT_SEXUAL_TITLES = new Set([
  "the sexy brutale",
  "ghost master",
  "genesis noir",
  "dream daddy: a dad dating simulator",
  "forgotten memories: remastered edition",
]);

/**
 * A title that says outright what the game is. The upstream flag misses
 * some; the title is the one thing such a game is never coy about.
 *
 * Substrings, not whole words. Anchoring to word boundaries let Softporn
 * Adventure, Porntris, Boobserman, Milfylicious, QLewds and Simusex through.
 *
 * The exceptions are the collisions with ordinary English, each carved out
 * by hand rather than by weakening the rule: the -sex counties, Milford,
 * XXXL. "adult" only counts in a phrase — Adult Only, adult sim — because on
 * its own it means grown-up, and it was hiding jigsaw puzzles and colouring
 * books.
 *
 * It errs towards hiding: an opted-in viewer still sees everything, and the
 * alternative is a child being shown a game called Hentai Girl.
 */
const SEXUAL_TITLE_PATTERN =
  /hentai|futanari|nukige|nsfw|bdsm|porn|ecchi|eroge|erotic|ahegao|lewd|boob|pussy|nude|nudit|(?<!es)(?<!us)(?<!dle)sex|milf(?!ord)|(?<![a-z])xxx(?![a-z])|adults?[ -]*(only|game|sim|film|content|version)/i;

/**
 * Whether a game is pornographic, from what the provider flagged and what
 * its title says. Not whether it contains a sex scene: an age rating
 * already tells a parent that, and Halo Infinite is not what the filter is
 * for.
 */
export const isSexualContent = (title: string, flagged: boolean): boolean => {
  if (NOT_SEXUAL_TITLES.has(title.trim().toLowerCase())) return false;
  return flagged || SEXUAL_TITLE_PATTERN.test(title);
};

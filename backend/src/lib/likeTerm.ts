const escapeLike = (term: string): string =>
  term.replace(/[\\%_]/g, (c) => `\\${c}`);

/** A contains-match for ILIKE. % and _ are wildcards to it, and a username
 *  can hold an underscore, so a search for "%%" would otherwise match
 *  everyone. */
export const likeTerm = (term: string): string => `%${escapeLike(term)}%`;

/** A starts-with match, which a btree index can answer. */
export const likePrefix = (term: string): string => `${escapeLike(term)}%`;

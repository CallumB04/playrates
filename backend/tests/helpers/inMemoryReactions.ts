import type { ReactionRepo } from "../../src/lib/reactions.js";

/** A votes table's rows: who, on what, and with which reaction, upvote when
 *  a seed leaves it out as the column's default does. */
type VoteRow = { user_id: string; reaction?: string } & Record<string, unknown>;

/** The reactions on one kind of thing, over a votes array in the state. */
export const createMemoryReactionRepo = <R extends VoteRow>(
  rows: () => R[],
  replace: (next: R[]) => void,
  column: string,
): ReactionRepo => {
  const idOf = (r: R) => Number(r[column]);
  const reactionOf = (r: R) => r.reaction ?? "upvote";
  return {
    async mine(userId, ids) {
      return new Map(
        rows()
          .filter((r) => r.user_id === userId && ids.includes(idOf(r)))
          .map((r) => [idOf(r), reactionOf(r)]),
      );
    },
    async all(ids) {
      const tallies = new Map<number, string[]>();
      for (const r of rows().filter((r) => ids.includes(idOf(r)))) {
        tallies.set(idOf(r), [...(tallies.get(idOf(r)) ?? []), reactionOf(r)]);
      }
      return tallies;
    },
    async of(userId, id) {
      const row = rows().find((r) => r.user_id === userId && idOf(r) === id);
      return row ? reactionOf(row) : null;
    },
    // The primary key is (thing, user): a second reaction replaces the first.
    async set(userId, id, reaction) {
      replace([
        ...rows().filter((r) => !(r.user_id === userId && idOf(r) === id)),
        { [column]: id, user_id: userId, reaction } as unknown as R,
      ]);
    },
    async remove(userId, id) {
      replace(rows().filter((r) => !(r.user_id === userId && idOf(r) === id)));
    },
    async count(id) {
      return rows().filter((r) => idOf(r) === id).length;
    },
  };
};

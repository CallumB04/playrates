import {
  DEFAULT_REACTION,
  tallyReactions,
  type ReactionKey,
  type ReactionState,
} from "@playrates/shared";
import { AppError } from "./AppError.js";

/**
 * The reactions on one kind of thing (a review, a list, a post), kept in its
 * votes table: one row per person per thing, saying which reaction.
 */
export interface ReactionRepo {
  /** The viewer's reaction on each of these, where they left one. */
  mine(userId: string, ids: number[]): Promise<Map<number, string>>;
  /** Every reaction on each of these. */
  all(ids: number[]): Promise<Map<number, string[]>>;
  of(userId: string, id: number): Promise<string | null>;
  /** Leaves a reaction, or swaps the one there for it. */
  set(userId: string, id: number, reaction: string): Promise<void>;
  remove(userId: string, id: number): Promise<void>;
  count(id: number): Promise<number>;
}

/** Reactions a member may leave, from their level and what they own. */
export type ReactionsFor = (userId: string) => Promise<Set<string>>;

/** A page's reactions, read in two queries, as each item's state. */
export const reactionStates = async (
  repo: ReactionRepo,
  viewerId: string | undefined,
  ids: number[],
) => {
  const [mine, all] = await Promise.all([
    viewerId ? repo.mine(viewerId, ids) : Promise.resolve(new Map()),
    repo.all(ids),
  ]);
  return (id: number, voteCount: number): ReactionState => ({
    voteCount,
    votedByViewer: mine.has(id),
    myReaction: (mine.get(id) as ReactionKey | undefined) ?? null,
    reactions: tallyReactions(all.get(id) ?? []),
  });
};

/**
 * Leaves a reaction: the same one again takes it back, another swaps it.
 * `added` is true only for a first reaction, which is what a milestone
 * counts.
 */
export const react = async (
  repo: ReactionRepo,
  reactionsFor: ReactionsFor,
  userId: string,
  id: number,
  reaction: string = DEFAULT_REACTION,
): Promise<{ state: ReactionState; added: boolean }> => {
  // The upvote is everyone's; anything else is checked against level and packs.
  if (
    reaction !== DEFAULT_REACTION &&
    !(await reactionsFor(userId)).has(reaction)
  ) {
    throw AppError.forbidden("That reaction isn't unlocked yet");
  }
  const current = await repo.of(userId, id);
  if (current === reaction) await repo.remove(userId, id);
  else await repo.set(userId, id, reaction);
  const [count, all] = await Promise.all([repo.count(id), repo.all([id])]);
  const mine = current === reaction ? null : (reaction as ReactionKey);
  return {
    state: {
      voteCount: count,
      votedByViewer: mine !== null,
      myReaction: mine,
      reactions: tallyReactions(all.get(id) ?? []),
    },
    added: current === null && mine !== null,
  };
};

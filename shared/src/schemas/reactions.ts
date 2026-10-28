import { z } from "zod";

/**
 * What people can leave on a review, a list or a community post. Everyone
 * has the upvote; the rest come by level, or one at a time from the shop.
 * Each says something a review, a list or a post can earn: praise, a laugh,
 * hype, sympathy. One reaction per person per thing: picking another swaps
 * it.
 */
export const REACTIONS = [
  { key: "upvote", label: "Upvote", icon: "ArrowBigUp" },
  { key: "fire", label: "Fire", icon: "Flame", level: 3 },
  { key: "love", label: "Love", icon: "Heart", level: 6 },
  { key: "lol", label: "LOL", icon: "Laugh", level: 10 },
  { key: "gg", label: "GG", icon: "Handshake", level: 15 },
  { key: "goat", label: "GOAT", icon: "Trophy", item: "react_goat" },
  { key: "dead", label: "Dead", icon: "Skull", item: "react_dead" },
  { key: "hype", label: "Hype", icon: "Rocket", item: "react_hype" },
  {
    key: "congrats",
    label: "Congrats",
    icon: "PartyPopper",
    item: "react_congrats",
  },
  {
    key: "big_brain",
    label: "Big brain",
    icon: "Brain",
    item: "react_big_brain",
  },
  { key: "sad", label: "Sad", icon: "Frown", item: "react_sad" },
] as const satisfies readonly (
  | { key: string; label: string; icon: string }
  | { key: string; label: string; icon: string; level: number }
  | { key: string; label: string; icon: string; item: string }
)[];

export type ReactionKey = (typeof REACTIONS)[number]["key"];
export const REACTION_KEYS = REACTIONS.map((r) => r.key) as [
  ReactionKey,
  ...ReactionKey[],
];
export const DEFAULT_REACTION: ReactionKey = "upvote";

export interface ReactionCount {
  reaction: ReactionKey;
  count: number;
}

/** What a reactable thing carries for its viewer. `voteCount` is every
 *  reaction together, so sorts and milestones read as before. */
export interface ReactionState {
  voteCount: number;
  votedByViewer: boolean;
  myReaction: ReactionKey | null;
  /** Each reaction left, most first. */
  reactions: ReactionCount[];
}

/** Leaving a reaction: the same one again takes it back. */
export const ReactBodySchema = z
  .object({ reaction: z.enum(REACTION_KEYS).default(DEFAULT_REACTION) })
  .strict()
  // An empty POST, as the vote button sent, is an upvote.
  .default({});

/** Counts per reaction, most first, ties in the catalogue's order. */
export const tallyReactions = (reactions: string[]): ReactionCount[] => {
  const counts = new Map<ReactionKey, number>();
  for (const r of reactions) {
    const key = (REACTION_KEYS as readonly string[]).includes(r)
      ? (r as ReactionKey)
      : DEFAULT_REACTION;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return REACTION_KEYS.filter((k) => counts.has(k))
    .map((reaction) => ({ reaction, count: counts.get(reaction)! }))
    .sort((a, b) => b.count - a.count);
};

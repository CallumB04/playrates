import {
    DEFAULT_REACTION,
    REACTION_KEYS,
    type ReactionCount,
    type ReactionKey,
} from "@playrates/shared";

export interface ReactionView {
    voteCount: number;
    myReaction: ReactionKey | null;
    reactions: ReactionCount[];
}

/**
 * What pressing a reaction does, worked out on the page so it shows at once:
 * the same one again takes it back, another swaps it. The server's answer
 * replaces this when it lands.
 */
export const applyReaction = (
    view: ReactionView,
    reaction: ReactionKey
): ReactionView => {
    const counts = new Map(view.reactions.map((r) => [r.reaction, r.count]));
    const bump = (key: ReactionKey, by: number) => {
        const next = (counts.get(key) ?? 0) + by;
        if (next > 0) counts.set(key, next);
        else counts.delete(key);
    };
    const taking = view.myReaction === reaction;
    if (view.myReaction) bump(view.myReaction, -1);
    if (!taking) bump(reaction, 1);
    return {
        voteCount: view.voteCount + (taking ? -1 : view.myReaction ? 0 : 1),
        myReaction: taking ? null : reaction,
        reactions: REACTION_KEYS.filter((k) => counts.has(k))
            .map((k) => ({ reaction: k, count: counts.get(k)! }))
            .sort((a, b) => b.count - a.count),
    };
};

/** How many of one reaction, the upvote's included at nought. */
export const countOf = (
    view: ReactionView,
    reaction: ReactionKey = DEFAULT_REACTION
) => view.reactions.find((r) => r.reaction === reaction)?.count ?? 0;

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

/** The reactions someone has left, the upvote first and the rest by how
 *  many: the order the bar shows them in. */
export const reactionOrder = (view: ReactionView): ReactionKey[] =>
    [...view.reactions]
        .sort((a, b) =>
            a.reaction === DEFAULT_REACTION
                ? -1
                : b.reaction === DEFAULT_REACTION
                  ? 1
                  : b.count - a.count
        )
        .map((r) => r.reaction);

/** The ones to show while the rest are folded away: the first few, and
 *  yours wherever it falls, so a press never hides what you pressed. All of
 *  them when only one would fold: a "+1" takes the room it saves. */
export const shownReactions = (
    order: ReactionKey[],
    mine: ReactionKey | null,
    limit: number
): Set<ReactionKey> => {
    const shown = new Set(order.slice(0, limit));
    if (mine && order.includes(mine)) shown.add(mine);
    return order.length - shown.size > 1 ? shown : new Set(order);
};

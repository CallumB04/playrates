import type {
    AwardBoardTier,
    AwardCategory,
    AwardNominee,
    AwardPicks,
    AwardsPhase,
    EventDetail,
} from "@playrates/shared";
import { formatDayTime } from "./format";

/** An awards night that's out before its nominees: its categories are
 *  set, with nobody in them to pick yet. */
export const awaitingNominees = (awards: {
    phase: AwardsPhase;
    nomineeCount?: number;
}): boolean => awards.phase === "open" && awards.nomineeCount === 0;

/** What a card about an event asks you to do: its kind's own ask, where it
 *  has one. */
export const eventAction = (event: {
    awards: { phase: AwardsPhase; nomineeCount?: number } | null;
    showcase?: unknown;
}): string => {
    if (event.showcase) return "See every reveal";
    if (event.awards && awaitingNominees(event.awards)) {
        return "See the categories";
    }
    switch (event.awards?.phase) {
        case "open":
            return "Make your picks";
        case "locked":
            return "See the picks";
        case "results":
            return "See the winners";
        default:
            return "See the event";
    }
};

/** The time left before a moment, in whole parts for a countdown; null
 *  once it's come. */
export const countdownParts = (
    target: string,
    now: number
): { days: number; hours: number; minutes: number; seconds: number } | null => {
    const left = Date.parse(target) - now;
    if (left <= 0) return null;
    const seconds = Math.floor(left / 1000);
    return {
        days: Math.floor(seconds / 86_400),
        hours: Math.floor((seconds % 86_400) / 3600),
        minutes: Math.floor((seconds % 3600) / 60),
        seconds: seconds % 60,
    };
};

/* -------------------------------------------------------------- awards */

/** Where an awards night is up to, in a line. */
export const awardsLine = (awards: {
    phase: AwardsPhase;
    picksCloseAt: string;
    nomineeCount?: number;
}): string => {
    if (awaitingNominees(awards)) return "Nominees coming soon";
    switch (awards.phase) {
        case "results":
            return "The winners are in";
        case "locked":
            return "Picks are closed. Winners soon";
        default:
            return `Picks close ${formatDayTime(awards.picksCloseAt)}`;
    }
};

/** A nominee's share of its category's picks, as a whole percentage. */
export const pickShare = (
    nominee: AwardNominee,
    category: AwardCategory
): number => {
    const total = category.nominees.reduce((sum, n) => sum + n.picks, 0);
    return total === 0 ? 0 : Math.round((nominee.picks / total) * 100);
};

/** The crowd's numbers show once you've picked, so they can't lead you,
 *  and for everyone once picks have closed. */
export const showsShares = (phase: AwardsPhase, picked: boolean): boolean =>
    picked || phase === "locked" || phase === "results";

/**
 * The event as it looks once a pick moves: one off where it was, one on
 * where it went. What the page shows before the server's counts come back.
 */
export const withPick = (
    event: EventDetail,
    picks: AwardPicks,
    categoryId: number,
    nomineeId: number | null
): EventDetail => {
    if (!event.awards) return event;
    const before = picks[categoryId];
    return {
        ...event,
        awards: {
            ...event.awards,
            categories: event.awards.categories.map((category) =>
                category.id !== categoryId
                    ? category
                    : {
                          ...category,
                          nominees: category.nominees.map((n) => ({
                              ...n,
                              picks:
                                  n.picks -
                                  (n.id === before ? 1 : 0) +
                                  (n.id === nomineeId ? 1 : 0),
                          })),
                      }
            ),
        },
    };
};

/** The event as it looks once you hype a reveal, or stop: one more or one
 *  fewer on its count. */
export const withHype = (
    event: EventDetail,
    revealId: number,
    on: boolean
): EventDetail =>
    event.showcase
        ? {
              ...event,
              showcase: {
                  ...event.showcase,
                  reveals: event.showcase.reveals.map((r) =>
                      r.id === revealId
                          ? { ...r, hype: Math.max(0, r.hype + (on ? 1 : -1)) }
                          : r
                  ),
              },
          }
        : event;

/** A showcase's reveals, most hyped first, the earlier shown first among
 *  equals. */
export const mostHyped = <T extends { id: number; hype: number }>(
    reveals: T[]
): T[] =>
    reveals
        .map((reveal, i) => ({ reveal, i }))
        .sort((a, b) => b.reveal.hype - a.reveal.hype || a.i - b.i)
        .map(({ reveal }) => reveal);

export const picksWith = (
    picks: AwardPicks,
    categoryId: number,
    nomineeId: number | null
): AwardPicks => {
    const next = { ...picks };
    if (nomineeId === null) delete next[categoryId];
    else next[categoryId] = nomineeId;
    return next;
};

/** How many you called, of the categories with a winner so far. */
export const score = (
    categories: AwardCategory[],
    picks: AwardPicks
): { called: number; decided: number } => {
    let called = 0;
    let decided = 0;
    for (const category of categories) {
        const winner = category.nominees.find((n) => n.won);
        if (!winner) continue;
        decided += 1;
        if (picks[category.id] === winner.id) called += 1;
    }
    return { called, decided };
};

/** The categories there's something to pick in. */
export const pickable = (categories: AwardCategory[]): AwardCategory[] =>
    categories.filter((c) => c.nominees.length > 0);

/** How many categories you've picked in, of those you could. */
export const pickedCount = (
    categories: AwardCategory[],
    picks: AwardPicks
): { picked: number; total: number } => {
    const open = pickable(categories);
    return {
        picked: open.filter((c) => picks[c.id] !== undefined).length,
        total: open.length,
    };
};

/** The distinct games among some categories' nominees. */
export const nomineeGameIds = (categories: AwardCategory[]): number[] => [
    ...new Set(
        categories.flatMap((c) =>
            c.nominees.flatMap((n) => (n.game ? [n.game.id] : []))
        )
    ),
];

/** The headline award, or the first when none is marked. */
export const headlineOf = (
    categories: AwardCategory[]
): AwardCategory | undefined =>
    categories.find((c) => c.headline) ?? categories[0];

/** Of these games, how many you've logged. */
export const loggedOf = (
    gameIds: number[],
    logged: ReadonlySet<number>
): { logged: number; total: number } => ({
    logged: gameIds.filter((id) => logged.has(id)).length,
    total: gameIds.length,
});

export interface CategoryGroup {
    /** The heading over it; empty for none. */
    section: string;
    /** The headline award's own group, which leads the page. */
    lead: boolean;
    categories: AwardCategory[];
}

/**
 * The categories as the page shows them: the headline award first on its
 * own, then each section's together, in the order its first category
 * comes. Ones with nothing to pick are left out, unless every one is
 * waiting for its nominees.
 */
export const groupCategories = (
    categories: AwardCategory[],
    { includeEmpty = false }: { includeEmpty?: boolean } = {}
): CategoryGroup[] => {
    const shown = includeEmpty ? categories : pickable(categories);
    const headline = headlineOf(shown);
    const groups: CategoryGroup[] = headline
        ? [{ section: "", lead: true, categories: [headline] }]
        : [];
    for (const category of shown) {
        if (category === headline) continue;
        const group = groups.find(
            (g) => !g.lead && g.section === category.section
        );
        if (group) group.categories.push(category);
        else
            groups.push({
                section: category.section,
                lead: false,
                categories: [category],
            });
    }
    return groups;
};

/** Where a category's section on the page is, for links to it. */
export const categoryAnchor = (category: { slug: string }) =>
    `award-${category.slug}`;

/**
 * Who's on one line of an awards leaderboard, in words: everyone named
 * when that's all of them, otherwise the first two and how many more. You
 * come first, and as "You", when it's your score.
 */
export const tierNames = (tier: AwardBoardTier, yours: boolean): string => {
    const names = tier.people.flatMap((p) =>
        p.hidden || p.isYou ? [] : [p.username]
    );
    const listed = yours ? ["You", ...names] : names;
    if (listed.length === 0) {
        return tier.players === 1 ? "1 player" : `${tier.players} players`;
    }
    if (listed.length === tier.players && listed.length <= 3) {
        return listed.length === 1
            ? listed[0]!
            : `${listed.slice(0, -1).join(", ")} and ${listed.at(-1)}`;
    }
    const shown = listed.slice(0, 2);
    const more = tier.players - shown.length;
    return `${shown.join(", ")} and ${more} ${more === 1 ? "other" : "others"}`;
};

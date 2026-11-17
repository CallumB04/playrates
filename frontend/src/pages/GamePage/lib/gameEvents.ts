import { REVEAL_TAG_LABELS, type GameEventEntry } from "@playrates/shared";

/** "A", "A and B", "A, B and C". */
export const andList = (items: string[]): string =>
    items.length <= 1
        ? (items[0] ?? "")
        : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

/** What a game did at an event, in a line or two: what it won, then what
 *  else it was up for; or how it was shown, and the hype for it. */
export const entryLines = (entry: GameEventEntry): string[] => {
    if (entry.awards) {
        const names = (won: boolean) =>
            entry
                .awards!.nominations.filter((n) => n.won === won)
                .map((n) => n.category);
        const won = names(true);
        const rest = names(false);
        return [
            won.length > 0 ? `Won ${andList(won)}` : null,
            rest.length > 0
                ? `${won.length > 0 ? "Also nominated" : "Nominated"} for ${andList(rest)}`
                : null,
        ].filter((line): line is string => line !== null);
    }
    if (entry.showcase) {
        return [
            `Shown: ${REVEAL_TAG_LABELS[entry.showcase.tag]}`,
            `${entry.showcase.hype} hyped`,
        ];
    }
    return [];
};

/** Whether it won anything there. */
export const wonAt = (entry: GameEventEntry): boolean =>
    entry.awards?.nominations.some((n) => n.won) ?? false;

/** What the card asks you to do, by the event's kind and stage. */
export const entryAction = (entry: GameEventEntry): string => {
    if (entry.showcase) return "See every reveal";
    switch (entry.awards?.phase) {
        case "open":
            return "Make your pick";
        case "results":
            return "See all the winners";
        default:
            return "See the nominees";
    }
};

/** The events on or to come, and the ones gone, apart. */
export const splitEntries = (entries: GameEventEntry[]) => ({
    ahead: entries.filter((e) => e.event.timing !== "past"),
    past: entries.filter((e) => e.event.timing === "past"),
});

/** IGDB's id for a picture, whatever size the address asks for, so the
 *  same picture is known at two sizes. */
const pictureId = (url: string) =>
    url.match(/\/([^/]+)\.(?:jpg|jpeg|png|webp)$/i)?.[1] ?? url;

/**
 * The first picture that isn't one already in use on the page: the game's
 * next one from the API, then the event's other games'. Null where there's
 * nothing else to show.
 */
export const otherArt = (
    candidates: (string | null | undefined)[],
    used: (string | null | undefined)[]
): string | null => {
    const taken = new Set(used.flatMap((u) => (u ? [pictureId(u)] : [])));
    return (
        candidates.find((c): c is string => !!c && !taken.has(pictureId(c))) ??
        null
    );
};

/**
 * A picture for each event's card that the page isn't already showing:
 * the game's own next pictures from the API first, then the event's other
 * games'. Two cards don't share one either.
 */
export const artForEntries = (
    entries: GameEventEntry[],
    gamePictures: string[],
    pageArt: string | null
): Map<string, string | null> => {
    const used: (string | null)[] = [pageArt];
    return new Map(
        entries.map((entry) => {
            const art = otherArt(
                [...gamePictures, ...entry.event.artworks],
                used
            );
            used.push(art);
            return [entry.event.slug, art];
        })
    );
};

/** A past event's result, as its card heads it: a win and what for, or
 *  what it was up for, or how it was shown. */
export const pastSummary = (
    entry: GameEventEntry
): { title: string; tags: string[]; won: boolean } => {
    if (entry.awards) {
        const won = entry.awards.nominations.filter((n) => n.won);
        const list = won.length > 0 ? won : entry.awards.nominations;
        const count = list.length;
        return {
            title:
                won.length > 0
                    ? `Won ${count === 1 ? "an award" : `${count} awards`}`
                    : `Nominated for ${count === 1 ? "an award" : `${count} awards`}`,
            tags: list.map((n) => n.category),
            won: won.length > 0,
        };
    }
    if (entry.showcase) {
        return {
            title: `Shown to ${entry.showcase.hype} hyped`,
            tags: [REVEAL_TAG_LABELS[entry.showcase.tag]],
            won: false,
        };
    }
    return { title: "", tags: [], won: false };
};

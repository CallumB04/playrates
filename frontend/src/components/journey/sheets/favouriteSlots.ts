/** Six places, each a game or empty, in the order the profile shows. */
export type Slots<T> = (T | null)[];

/** A list laid into `size` places, the rest empty. */
export const toSlots = <T>(items: T[], size: number): Slots<T> =>
    Array.from({ length: size }, (_, i) => items[i] ?? null);

/** Two places traded, a game moving into an empty one. */
export const swapSlots = <T>(slots: Slots<T>, a: number, b: number) => {
    const next = [...slots];
    [next[a], next[b]] = [next[b]!, next[a]!];
    return next;
};

/** A game put in a place, taking it out of any other first. */
export const placeIn = <T extends { id: number }>(
    slots: Slots<T>,
    at: number,
    game: T
): Slots<T> =>
    slots.map((s, i) => (i === at ? game : s?.id === game.id ? null : s));

/** The first empty place after `from`, coming round; `from` if none. */
export const nextEmpty = <T>(slots: Slots<T>, from: number): number => {
    for (let step = 1; step <= slots.length; step++) {
        const i = (from + step) % slots.length;
        if (slots[i] === null) return i;
    }
    return from;
};

/** What saves: the games in order, the gaps closed up. */
export const filled = <T>(slots: Slots<T>): T[] =>
    slots.filter((s): s is T => s !== null);

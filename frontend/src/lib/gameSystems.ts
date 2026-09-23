import type { PlatformSystem } from "@playrates/shared";

/**
 * The machines worth offering for one game, in catalogue order.
 *
 * Two things stop the list being a plain filter. A game we hold no system data
 * for would otherwise offer nothing at all, so it falls back to the full list
 * rather than a dead control. And a log already recording a machine keeps it
 * even when the catalogue disagrees — someone who logged a PS3 copy we have
 * since stopped listing should not have that quietly cleared on their next
 * save.
 */
export const systemsForGame = (
    all: PlatformSystem[],
    gameSystems: string[],
    selected?: string | null
): PlatformSystem[] => {
    if (gameSystems.length === 0) return all;

    const wanted = new Set(gameSystems);
    if (selected) wanted.add(selected);

    return all.filter((system) => wanted.has(system.slug));
};

/** The family a machine belongs to. Logs record both: the family drives the
 *  stats and filters, the machine is what the reader actually wants to see. */
export const familyOf = (all: PlatformSystem[], slug: string): string | null =>
    all.find((system) => system.slug === slug)?.platformSlug ?? null;

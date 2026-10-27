/** A web address as a link reads it: no scheme, no www, no trailing slash. */
export const linkLabel = (url: string): string =>
    url
        .replace(/^https?:\/\//i, "")
        .replace(/^www\./i, "")
        .replace(/\/$/, "");

/** A Steam profile by its custom name, where it has one; a numbered one
 *  says nothing worth reading, so it is just "Steam". */
export const steamLabel = (url: string): string =>
    /\/id\/([^/]+)$/.exec(url)?.[1] ?? "Steam profile";

/** The list with one item moved to another place, the rest in order. */
export const moveItem = <T>(list: T[], from: number, to: number): T[] => {
    if (to < 0 || to >= list.length || from === to) return list;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    return next;
};

const PODIUM = ["text-medal-gold", "text-medal-silver", "text-medal-bronze"];

/** A favourite's place as a colour: gold, silver and bronze for the top
 *  three, the rest left plain. Places count from 1. */
export const rankTone = (place: number): string =>
    PODIUM[place - 1] ?? "text-content-muted";

/** A phone shows a ranked row's podium only: three across, where five
 *  wrapped two onto a second row. */
export const podiumOnPhone = (place: number): string | undefined =>
    place > PODIUM.length ? "max-sm:hidden" : undefined;

import type { AwardsPhase, EventTiming } from "@playrates/shared";

/** A name as an address: "Best Score and Music" is best-score-and-music. */
export const slugify = (text: string): string =>
    text
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80)
        .replace(/-+$/, "");

/** A moment's wall clock in one zone, to the minute. */
const wallClock = (ms: number, zone: string) => {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: zone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(new Date(ms));
    const part = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((p) => p.type === type)?.value ?? "00";
    return {
        year: part("year"),
        month: part("month"),
        day: part("day"),
        hour: part("hour"),
        minute: part("minute"),
    };
};

/** How far ahead of UTC a zone's clocks are at a moment, in ms. */
const offsetAt = (ms: number, zone: string): number => {
    const c = wallClock(ms, zone);
    const asUtc = Date.UTC(+c.year, +c.month - 1, +c.day, +c.hour, +c.minute);
    return asUtc - (ms - (ms % 60_000));
};

/** A moment as a datetime-local field shows it, on the clocks of the zone
 *  chosen beside it rather than whatever the device is set to. */
export const toZonedInput = (iso: string, zone: string): string => {
    const c = wallClock(Date.parse(iso), zone);
    return `${c.year}-${c.month}-${c.day}T${c.hour}:${c.minute}`;
};

/** What a datetime-local field holds, read on that zone's clocks, as the
 *  moment it means. Null while it's empty or half typed. */
export const fromZonedInput = (value: string, zone: string): string | null => {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
    if (!m) return null;
    const asUtc = Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!);
    // The offset is the zone's at the moment meant, which across a clock
    // change differs from its offset at the first guess.
    const first = asUtc - offsetAt(asUtc, zone);
    return new Date(asUtc - offsetAt(first, zone)).toISOString();
};

/** A zone as the form names it: "Europe/London (GMT+1)", its offset as it
 *  stands at the moment given. */
export const zoneLabel = (zone: string, at: number = Date.now()): string => {
    const offset =
        new Intl.DateTimeFormat("en-GB", {
            timeZone: zone,
            timeZoneName: "shortOffset",
        })
            .formatToParts(new Date(at))
            .find((p) => p.type === "timeZoneName")?.value ?? "";
    return `${zone.replace(/_/g, " ")}${offset ? ` (${offset})` : ""}`;
};

/** The ids with one moved up or down a place; the same list at either end. */
export const moved = (ids: number[], index: number, by: -1 | 1): number[] => {
    const to = index + by;
    if (to < 0 || to >= ids.length) return ids;
    const next = [...ids];
    [next[index], next[to]] = [next[to]!, next[index]!];
    return next;
};

/** Where an event is up to, for the admin's list: a draft, then its
 *  kind's own stage, or where it is in time. */
export const statusLabel = (event: {
    publishedAt: string | null;
    timing: EventTiming;
    awards: { phase: AwardsPhase } | null;
}): string => {
    if (!event.publishedAt) return "Draft";
    if (event.awards) {
        return {
            open: "Picks open",
            locked: "Picks closed",
            results: "Winners out",
        }[event.awards.phase];
    }
    return { upcoming: "Coming up", live: "On now", past: "Ended" }[
        event.timing
    ];
};

/** The announcements composer, filled in for this event: for an awards
 *  night, the nominees, or once there are winners, the winners. */
export const announceHref = (event: {
    name: string;
    slug: string;
    tagline: string;
    awards: { phase: AwardsPhase } | null;
}): string => {
    const results = event.awards?.phase === "results";
    const params = new URLSearchParams({
        tone: "celebration",
        title: !event.awards
            ? event.name
            : results
              ? `${event.name}: the winners are in`
              : `${event.name}: the nominees are in`,
        body: !event.awards
            ? event.tagline
            : results
              ? "See who won, and how many you called."
              : "Pick who you think wins each award, and log the nominees as you go.",
        link: `/events/${event.slug}`,
    });
    return `/admin/announcements?${params.toString()}`;
};

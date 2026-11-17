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

const pad = (n: number) => String(n).padStart(2, "0");

/** A moment as a datetime-local field shows it: in the admin's own zone. */
export const toLocalInput = (iso: string): string => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** What a datetime-local field holds, as the moment it means. Null while
 *  it's empty or half typed. */
export const fromLocalInput = (value: string): string | null => {
    const d = new Date(value);
    return value && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
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

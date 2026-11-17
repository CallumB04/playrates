import {
    eventTiming,
    type EventSummary,
    type GameSort,
} from "@playrates/shared";

export type NavMenuKey = "library" | "community" | "events";

export interface NavItem {
    to: string;
    label: string;
    exact: boolean;
    /** The menu it opens, if any. Home has none. */
    menu: NavMenuKey | null;
}

export const NAV_ITEMS: NavItem[] = [
    { to: "/", label: "Home", exact: true, menu: null },
    { to: "/library", label: "Library", exact: false, menu: "library" },
    { to: "/community", label: "Community", exact: false, menu: "community" },
    { to: "/events", label: "Events", exact: false, menu: "events" },
];

/** Which way a new menu's contents slide in: from the side it's on, so
 *  moving along the bar reads as moving along. */
export const slideFrom = (
    from: NavMenuKey | null,
    to: NavMenuKey
): "left" | "right" | null => {
    if (!from || from === to) return null;
    const order = NAV_ITEMS.map((item) => item.menu);
    return order.indexOf(to) > order.indexOf(from) ? "right" : "left";
};

export const librarySortPath = (sort: GameSort) =>
    sort === "logged" ? "/library" : `/library?sort=${sort}`;

/** The years worth a best-of link: this one and the last, as the footer
 *  has this one. */
export const bestOfYears = (now: Date = new Date()) => {
    const year = now.getFullYear();
    return [year, year - 1];
};

/** A short list chosen by hand: the menu is a way in, not the index. */
export const MENU_GENRES = [
    { slug: "role-playing-rpg", name: "Role-playing" },
    { slug: "shooter", name: "Shooter" },
    { slug: "adventure", name: "Adventure" },
    { slug: "indie", name: "Indie" },
    { slug: "strategy", name: "Strategy" },
    { slug: "platform", name: "Platform" },
] as const;

export const MENU_PLATFORMS = [
    { slug: "playstation", name: "PlayStation" },
    { slug: "xbox", name: "Xbox" },
    { slug: "nintendo-switch", name: "Switch" },
    { slug: "steam", name: "Steam" },
] as const;

/** The events menu: its lead (what's on, else what's next, else the
 *  latest to finish), then what's coming up, soonest first, and what's
 *  past, latest first, a couple of each. */
export const menuEvents = (
    events: EventSummary[],
    now: Date = new Date(),
    limit = 2
): {
    lead: EventSummary | null;
    upcoming: EventSummary[];
    past: EventSummary[];
} => {
    const at = (e: EventSummary) => Date.parse(e.startsAt);
    const timed = (timing: string) =>
        events.filter((e) => eventTiming(e, now) === timing);
    const live = timed("live").sort((a, b) => at(a) - at(b));
    const upcoming = timed("upcoming").sort((a, b) => at(a) - at(b));
    const past = timed("past").sort((a, b) => at(b) - at(a));
    const lead = live[0] ?? upcoming[0] ?? past[0] ?? null;
    const rest = (list: EventSummary[]) =>
        list.filter((e) => e !== lead).slice(0, limit);
    return {
        lead,
        upcoming: rest([...live, ...upcoming]),
        past: rest(past),
    };
};

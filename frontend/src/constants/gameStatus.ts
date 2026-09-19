/**
 * Game log statuses and their presentation.
 *
 * The class strings here are deliberately written out in full rather than
 * composed at runtime: Tailwind scans source files for complete class names,
 * so anything built by string concatenation gets purged from the stylesheet.
 */

/** Top-level status of a game log. */
export const GAME_STATUSES = [
    "played",
    "playing",
    "backlog",
    "wishlist",
] as const;

export type GameStatus = (typeof GAME_STATUSES)[number];

/** Further detail, only meaningful when the status is "played". */
export const PLAYED_STATUSES = [
    "finished",
    "mastered",
    "shelved",
    "retired",
] as const;

export type PlayedStatus = (typeof PLAYED_STATUSES)[number];

/** Any status that can be displayed as a coloured badge. */
export type DisplayStatus = GameStatus | PlayedStatus;

interface StatusColors {
    bg: string;
    text: string;
}

/**
 * Badge colours per status. The /20 tint is exactly the 0x33 alpha the
 * original hardcoded values used (0x33 / 0xff = 0.2).
 */
const STATUS_COLORS: Partial<Record<DisplayStatus, StatusColors>> = {
    finished: { bg: "bg-status-finished/20", text: "text-status-finished" },
    mastered: { bg: "bg-status-mastered/20", text: "text-status-mastered" },
    shelved: { bg: "bg-status-shelved/20", text: "text-status-shelved" },
    retired: { bg: "bg-status-retired/20", text: "text-status-retired" },
    playing: { bg: "bg-status-playing/20", text: "text-status-playing" },
    backlog: { bg: "bg-status-backlog/20", text: "text-status-backlog" },
    wishlist: { bg: "bg-status-wishlist/20", text: "text-status-wishlist" },
};

/** Font Awesome icon per top-level status. */
const STATUS_ICONS: Partial<Record<DisplayStatus, string>> = {
    played: "fa-regular fa-check-circle",
    playing: "fa-regular fa-play-circle",
    backlog: "fa-regular fa-calendar-plus",
    wishlist: "fa-solid fa-heart",
};

export const getColorFromGameStatus = (
    status: string
): StatusColors | undefined => STATUS_COLORS[status as DisplayStatus];

export const getIconFromGameStatus = (status: string): string | undefined =>
    STATUS_ICONS[status as DisplayStatus];

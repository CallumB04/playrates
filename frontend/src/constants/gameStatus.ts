import type { StatusMarkName } from "../lib/marks";

/** Game log statuses and their presentation. */

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

/** Any status that can be displayed as a badge. */
export type DisplayStatus = GameStatus | PlayedStatus;

/**
 * Only two curved things exist in the system, and one of them is the mastered
 * pill — which is what makes it mean something.
 */
export type StatusShape = "square" | "cut" | "pill";

const SHAPE_RADIUS: Record<StatusShape, string> = {
    square: "rounded-plate",
    cut: "rounded-cut",
    pill: "rounded-pill",
};

export interface StatusPresentation {
    /** Always rendered as real text. Hue is never the only channel. */
    label: string;
    shape: StatusShape;
    mark: StatusMarkName;
    /** Border, background and text, as complete literal classes. */
    chip: string;
    /** The mark's own tone, which differs from the label's. */
    markTone: string;
    /** The solid hue, for bars, tab edges and dots. */
    accent: string;
}

/**
 * Four hues for the top-level states, four shapes for the substatuses — plus
 * the word, always. The substatuses inherit "played" purple and separate by
 * shape, so the eight never collide.
 */
export const STATUS_PRESENTATION: Record<DisplayStatus, StatusPresentation> = {
    played: {
        label: "Played",
        shape: "square",
        mark: "square",
        chip: "border-status-played bg-status-played-quiet text-content",
        markTone: "text-status-played",
        accent: "bg-status-played",
    },
    playing: {
        label: "Playing",
        shape: "square",
        mark: "play",
        chip: "border-status-playing bg-status-playing-quiet text-content",
        markTone: "text-status-playing",
        accent: "bg-status-playing",
    },
    backlog: {
        label: "Backlog",
        shape: "square",
        mark: "outlineSquare",
        chip: "border-status-backlog bg-status-backlog-quiet text-content",
        markTone: "text-status-backlog",
        accent: "bg-status-backlog",
    },
    wishlist: {
        label: "Wishlist",
        shape: "square",
        mark: "diamond",
        chip: "border-status-wishlist bg-status-wishlist-quiet text-content",
        markTone: "text-status-wishlist",
        accent: "bg-status-wishlist",
    },
    mastered: {
        label: "Mastered",
        shape: "pill",
        mark: "disc",
        chip: "border-brand bg-brand-subtle text-content",
        markTone: "text-brand",
        accent: "bg-status-mastered",
    },
    finished: {
        label: "Finished",
        shape: "square",
        mark: "square",
        chip: "border-strong bg-surface-raised text-content",
        markTone: "text-brand",
        accent: "bg-status-finished",
    },
    shelved: {
        label: "Shelved",
        shape: "cut",
        mark: "ledger",
        chip: "border-strong bg-surface-raised text-content-secondary",
        markTone: "text-content-secondary",
        accent: "bg-status-shelved",
    },
    retired: {
        label: "Retired",
        shape: "square",
        mark: "hollowSquare",
        chip: "border-subtle bg-surface-sunken text-content-secondary",
        markTone: "text-content-muted",
        accent: "bg-status-retired",
    },
};

export const statusRadius = (status: DisplayStatus): string =>
    SHAPE_RADIUS[STATUS_PRESENTATION[status].shape];

export const isDisplayStatus = (value: string): value is DisplayStatus =>
    value in STATUS_PRESENTATION;

/**
 * The status to show for a log: the substatus is more specific than "played",
 * and only exists when the log is played at all.
 */
export const displayStatusFor = (
    status: GameStatus,
    playedStatus: PlayedStatus | null | undefined
): DisplayStatus => (status === "played" && playedStatus ? playedStatus : status);

import {
    Archive,
    CircleCheck,
    Flag,
    Heart,
    Layers,
    Pause,
    Play,
    Trophy,
    type LucideIcon,
} from "lucide-react";

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

export interface StatusPresentation {
    /** Always rendered as real text. Hue is never the only channel. */
    label: string;
    /**
     * The non-colour channel. These were abstract shapes — a square, a
     * diamond — which told you a state existed without telling you which. An
     * icon that means the thing carries the same accessibility job and
     * actually reads.
     */
    icon: LucideIcon;
    /** One line on what the state means, for pickers that have room. */
    hint: string;
    /** Border, background and text, as complete literal classes. */
    chip: string;
    /** The icon's own tone, which differs from the label's. */
    markTone: string;
    /** The solid hue, for bars, tab edges and dots. */
    accent: string;
}

/**
 * Four hues for the top-level states, plus a distinct icon and the word for
 * every one of the eight. The played substatuses share the played hue and are
 * told apart by their icon, so hue is never carrying a distinction alone.
 */
export const STATUS_PRESENTATION: Record<DisplayStatus, StatusPresentation> = {
    played: {
        label: "Played",
        icon: CircleCheck,
        hint: "Done with it",
        chip: "border-status-played bg-status-played-quiet text-content",
        markTone: "text-status-played",
        accent: "bg-status-played",
    },
    playing: {
        label: "Playing",
        icon: Play,
        hint: "On the go",
        chip: "border-status-playing bg-status-playing-quiet text-content",
        markTone: "text-status-playing",
        accent: "bg-status-playing",
    },
    backlog: {
        label: "Backlog",
        icon: Layers,
        hint: "Getting to it",
        chip: "border-status-backlog bg-status-backlog-quiet text-content",
        markTone: "text-status-backlog",
        accent: "bg-status-backlog",
    },
    wishlist: {
        label: "Wishlist",
        icon: Heart,
        hint: "Want it",
        chip: "border-status-wishlist bg-status-wishlist-quiet text-content",
        markTone: "text-status-wishlist",
        accent: "bg-status-wishlist",
    },
    mastered: {
        label: "Mastered",
        icon: Trophy,
        hint: "Every achievement",
        chip: "border-brand bg-brand-subtle text-content",
        markTone: "text-brand",
        accent: "bg-status-mastered",
    },
    finished: {
        label: "Finished",
        icon: Flag,
        hint: "Saw the credits",
        chip: "border-strong bg-surface-raised text-content",
        markTone: "text-brand",
        accent: "bg-status-finished",
    },
    shelved: {
        label: "Shelved",
        icon: Pause,
        hint: "Might come back",
        chip: "border-strong bg-surface-raised text-content-secondary",
        markTone: "text-content-secondary",
        accent: "bg-status-shelved",
    },
    retired: {
        label: "Retired",
        icon: Archive,
        hint: "Not going back",
        chip: "border-subtle bg-surface-sunken text-content-secondary",
        markTone: "text-content-muted",
        accent: "bg-status-retired",
    },
};

export const isDisplayStatus = (value: string): value is DisplayStatus =>
    value in STATUS_PRESENTATION;

/**
 * The status to show for a log: the substatus is more specific than "played",
 * and only exists when the log is played at all.
 */
export const displayStatusFor = (
    status: GameStatus,
    playedStatus: PlayedStatus | null | undefined
): DisplayStatus =>
    status === "played" && playedStatus ? playedStatus : status;

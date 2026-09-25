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
    /** The non-colour channel. No two statuses share one. */
    icon: LucideIcon;
    /** One line on what the state means, for pickers that have room. */
    hint: string;
    /** Border, background and text, as complete literal classes. */
    chip: string;
    /** The icon's own tone, which differs from the label's. */
    markTone: string;
    /** The solid hue, for bars, tab edges and dots. */
    accent: string;
    /** Border and text over box art. The chip hues wash out on a photograph,
     *  so this is the light end of each ramp against a scrim. */
    onMediaTone: string;
}

/** Eight states, each with its own hue, icon and word, so no single channel
 *  ever carries a distinction alone. */
export const STATUS_PRESENTATION: Record<DisplayStatus, StatusPresentation> = {
    played: {
        label: "Played",
        icon: CircleCheck,
        hint: "Done with it",
        chip: "border-status-played bg-status-played-quiet text-content",
        markTone: "text-status-played",
        accent: "bg-status-played",
        onMediaTone: "border-status-played/60 text-[#c9bcff]",
    },
    playing: {
        label: "Playing",
        icon: Play,
        hint: "On the go",
        chip: "border-status-playing bg-status-playing-quiet text-content",
        markTone: "text-status-playing",
        accent: "bg-status-playing",
        onMediaTone: "border-status-playing/70 text-[#ffc08a]",
    },
    backlog: {
        label: "Backlog",
        icon: Layers,
        hint: "Getting to it",
        chip: "border-status-backlog bg-status-backlog-quiet text-content",
        markTone: "text-status-backlog",
        accent: "bg-status-backlog",
        onMediaTone: "border-status-backlog/70 text-[#a5f3fc]",
    },
    wishlist: {
        label: "Wishlist",
        icon: Heart,
        hint: "Want it",
        chip: "border-status-wishlist bg-status-wishlist-quiet text-content",
        markTone: "text-status-wishlist",
        accent: "bg-status-wishlist",
        onMediaTone: "border-status-wishlist/70 text-[#fbcfe8]",
    },
    finished: {
        label: "Finished",
        icon: Flag,
        hint: "Saw the credits",
        chip: "border-status-finished bg-status-finished-quiet text-content",
        markTone: "text-status-finished",
        accent: "bg-status-finished",
        onMediaTone: "border-status-finished/60 text-[#a7f3d0]",
    },
    mastered: {
        label: "Mastered",
        icon: Trophy,
        hint: "Every achievement",
        chip: "border-status-mastered bg-status-mastered-quiet text-content",
        markTone: "text-status-mastered",
        accent: "bg-status-mastered",
        onMediaTone: "border-status-mastered/70 text-[#f2d98a]",
    },
    shelved: {
        label: "Shelved",
        icon: Pause,
        hint: "Might come back",
        chip: "border-status-shelved bg-status-shelved-quiet text-content",
        markTone: "text-status-shelved",
        accent: "bg-status-shelved",
        onMediaTone: "border-status-shelved/70 text-[#cbd5e1]",
    },
    retired: {
        label: "Retired",
        icon: Archive,
        hint: "Not going back",
        chip: "border-status-retired bg-status-retired-quiet text-content",
        markTone: "text-status-retired",
        accent: "bg-status-retired",
        onMediaTone: "border-status-retired/70 text-[#fecaca]",
    },
};

export const isDisplayStatus = (value: string): value is DisplayStatus =>
    value in STATUS_PRESENTATION;

/** The status to show for a log — the substatus wins where there is one. */
export const displayStatusFor = (
    status: GameStatus,
    playedStatus: PlayedStatus | null | undefined
): DisplayStatus =>
    status === "played" && playedStatus ? playedStatus : status;

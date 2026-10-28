import {
    ArrowBigUp,
    Brain,
    Flame,
    Frown,
    Handshake,
    Heart,
    Laugh,
    PartyPopper,
    Rocket,
    Skull,
    Trophy,
    type LucideIcon,
} from "lucide-react";

/** The shared catalogue names each reaction's icon; these are them. */
export const REACTION_ICONS: Record<string, LucideIcon> = {
    ArrowBigUp,
    Brain,
    Flame,
    Frown,
    Handshake,
    Heart,
    Laugh,
    PartyPopper,
    Rocket,
    Skull,
    Trophy,
};

/* Each reaction's own colour, as an emoji has one: mid tones, so each reads
   on paper and on ink alike. The upvote keeps the brand's. */
export const REACTION_COLOURS: Record<string, string> = {
    upvote: "var(--brand)",
    fire: "#f2701d",
    love: "#e8417a",
    lol: "#e2a30d",
    gg: "#14a89a",
    goat: "#d4930c",
    dead: "#8a909e",
    hype: "#ef5a3c",
    congrats: "#2f8fe0",
    big_brain: "#e2589b",
    sad: "#7c86c9",
};

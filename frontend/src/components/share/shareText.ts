import type { BadgeDef, Metal } from "@playrates/shared";
import { METAL_NAMES } from "../progress/rewardText";
import { profilePath } from "../../lib/profilePaths";
import type { ShareMoment } from "../../lib/shareMoment";

/** What each moment says when shared, in the member's own voice. */

export const levelMoment = (username: string, level: number): ShareMoment => ({
    title: `Level ${level}`,
    path: profilePath(username),
    text: `I just reached level ${level} on PlayRates`,
});

export const badgeMoment = (
    username: string,
    badge: BadgeDef,
    metal: Metal
): ShareMoment => {
    const name =
        badge.tiers.length > 1
            ? `${badge.name}, ${METAL_NAMES[metal]}`
            : badge.name;
    return {
        title: name,
        path: profilePath(username, "badges"),
        text: `I just earned the ${name} badge on PlayRates`,
    };
};

export const finishedMoment = (
    game: { id: number; title: string },
    rating: number | null,
    mastered = false
): ShareMoment => {
    const done = `I just ${mastered ? "mastered" : "finished"} ${game.title}`;
    return {
        title: game.title,
        path: `/game/${game.id}`,
        text:
            rating === null
                ? done
                : // 9/10 in a sentence, not the table's 9.00/10.
                  `${done} and gave it ${Number(rating.toFixed(2))}/10`,
    };
};

export const shelfMoment = (username: string, count: number): ShareMoment => ({
    title:
        count === 1
            ? "Your first game"
            : `${count.toLocaleString("en-GB")} games`,
    path: profilePath(username, "games"),
    text:
        count === 1
            ? "I just logged my first game on PlayRates"
            : `That's ${count.toLocaleString("en-GB")} games on my PlayRates shelves`,
});

/** The address a moment is shared at, carrying the sharer's invite. */
export const shareUrl = (origin: string, path: string, username: string) =>
    `${origin}${path}${path.includes("?") ? "&" : "?"}ref=${encodeURIComponent(username)}`;

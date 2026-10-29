import {
    CARD_THEMES,
    FRAMES,
    NAME_COLOURS,
    NAME_FONTS,
    REACTIONS,
    BACKGROUND_LEVEL,
    levelTokens,
    type BadgeDef,
    type Metal,
    type XpGain,
} from "@playrates/shared";
import { formatCount } from "../../lib/format";
import { SOURCE_LABELS } from "./sources";

const METAL_NAMES: Record<Metal, string> = {
    1: "Bronze",
    2: "Silver",
    3: "Gold",
    4: "Platinum",
};

/** XP just earned, as one line for a toast: the total and what for.
 *  "+25 XP: Finished a game, Rated a game" */
export const xpToastText = (gains: XpGain[]): string => {
    const total = gains.reduce((n, g) => n + g.xp, 0);
    const reasons = [
        ...new Set(gains.map((g) => SOURCE_LABELS[g.source]).filter(Boolean)),
    ];
    const said =
        reasons.length > 2
            ? `${reasons.slice(0, 2).join(", ")} and ${reasons.length - 2} more`
            : reasons.join(", ");
    return `+${formatCount(total)} XP${said ? `: ${said}` : ""}`;
};

/** A badge just earned, as one line for a toast. */
export const badgeToastText = (badge: BadgeDef, metal: Metal): string =>
    badge.tiers.length > 1
        ? `New badge: ${badge.name}, ${METAL_NAMES[metal]}`
        : `New badge: ${badge.name}`;

export interface LevelReward {
    kind: "frame" | "theme" | "font" | "colour" | "reaction" | "background";
    key: string;
    level: number;
    /** As a row names it: "Gold frame". */
    label: string;
    /** As a sentence says it: "the Gold frame". */
    phrase: string;
}

const reward = (
    kind: LevelReward["kind"],
    key: string,
    level: number,
    label: string
): LevelReward => ({ kind, key, level, label, phrase: `the ${label}` });

/** Everything a level opens, earliest first. */
export const LEVEL_REWARDS: LevelReward[] = [
    ...FRAMES.flatMap((f) =>
        "level" in f
            ? [reward("frame", f.key, f.level, `${f.label} frame`)]
            : []
    ),
    ...CARD_THEMES.flatMap((t) =>
        "level" in t
            ? [reward("theme", t.key, t.level, `${t.label} card theme`)]
            : []
    ),
    ...NAME_FONTS.flatMap((f) =>
        "level" in f
            ? [reward("font", f.key, f.level, `${f.label} name font`)]
            : []
    ),
    ...NAME_COLOURS.flatMap((c) =>
        "level" in c
            ? [reward("colour", c.key, c.level, `${c.label} name colour`)]
            : []
    ),
    ...REACTIONS.flatMap((r) =>
        "level" in r
            ? [reward("reaction", r.key, r.level, `${r.label} reaction`)]
            : []
    ),
    {
        kind: "background" as const,
        key: "background",
        level: BACKGROUND_LEVEL,
        label: "Profile backgrounds",
        phrase: "profile backgrounds",
    },
].sort((a, b) => a.level - b.level);

/** What a climb opens, from the level after `from` up to `to`; one level
 *  when `from` is left out. A single badge can lift you several at once. */
export const unlocksBetween = (to: number, from = to - 1): LevelReward[] =>
    LEVEL_REWARDS.filter((r) => r.level > from && r.level <= to);

/** The tokens a climb paid, every level in it counted. */
export const tokensBetween = (to: number, from = to - 1): number => {
    let total = 0;
    for (let level = from + 1; level <= to; level++)
        total += levelTokens(level);
    return total;
};

/** The next level that opens anything, and the first thing it opens. */
export const nextReward = (level: number): LevelReward | undefined =>
    LEVEL_REWARDS.find((r) => r.level > level);

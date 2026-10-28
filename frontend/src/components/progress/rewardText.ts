import {
    CARD_THEMES,
    FRAMES,
    NAME_COLOURS,
    NAME_FONTS,
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
    kind: "frame" | "theme" | "font" | "colour";
    key: string;
    level: number;
    label: string;
}

/** Everything a level opens, earliest first. */
export const LEVEL_REWARDS: LevelReward[] = [
    ...FRAMES.flatMap((f) =>
        "level" in f
            ? [
                  {
                      kind: "frame" as const,
                      key: f.key,
                      level: f.level,
                      label: `${f.label} frame`,
                  },
              ]
            : []
    ),
    ...CARD_THEMES.flatMap((t) =>
        "level" in t
            ? [
                  {
                      kind: "theme" as const,
                      key: t.key,
                      level: t.level,
                      label: `${t.label} card theme`,
                  },
              ]
            : []
    ),
    ...NAME_FONTS.flatMap((f) =>
        "level" in f
            ? [
                  {
                      kind: "font" as const,
                      key: f.key,
                      level: f.level,
                      label: `${f.label} name font`,
                  },
              ]
            : []
    ),
    ...NAME_COLOURS.flatMap((c) =>
        "level" in c
            ? [
                  {
                      kind: "colour" as const,
                      key: c.key,
                      level: c.level,
                      label: `${c.label} name colour`,
                  },
              ]
            : []
    ),
].sort((a, b) => a.level - b.level);

/** What a level opens: a frame, a card theme, a font or a colour. */
export const unlocksAt = (level: number): LevelReward[] =>
    LEVEL_REWARDS.filter((r) => r.level === level);

/** The next level that opens anything, and the first thing it opens. */
export const nextReward = (level: number): LevelReward | undefined =>
    LEVEL_REWARDS.find((r) => r.level > level);

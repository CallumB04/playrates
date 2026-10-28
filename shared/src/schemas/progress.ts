import { z } from "zod";

/* ---------------------------------------------------------------- levels */

export const MAX_LEVEL = 100;

/** Total XP to reach a level: each one costs 50 more than the last, so the
 *  first few come in a session and the late ones take years. */
export const xpForLevel = (level: number): number => {
  const n = Math.max(0, Math.min(MAX_LEVEL, level) - 1);
  return 25 * n * n + 75 * n;
};

export interface LevelState {
  level: number;
  xp: number;
  /** XP at the start of this level and of the next; null at the cap. */
  floor: number;
  next: number | null;
  /** 0 to 1 through this level; 1 at the cap. */
  progress: number;
}

export const levelFor = (xp: number): LevelState => {
  const total = Math.max(0, Math.floor(xp));
  // The inverse of xpForLevel, then nudged for rounding at the edges.
  let level = Math.floor((-75 + Math.sqrt(5625 + 100 * total)) / 50) + 1;
  level = Math.max(1, Math.min(MAX_LEVEL, level));
  while (level < MAX_LEVEL && xpForLevel(level + 1) <= total) level++;
  while (level > 1 && xpForLevel(level) > total) level--;
  const floor = xpForLevel(level);
  const next = level < MAX_LEVEL ? xpForLevel(level + 1) : null;
  return {
    level,
    xp: total,
    floor,
    next,
    progress: next === null ? 1 : (total - floor) / (next - floor),
  };
};

/** Tokens a level is worth on reaching it. */
export const levelTokens = (level: number): number =>
  level % 10 === 0 ? 50 : level % 5 === 0 ? 25 : 10;

/* ---------------------------------------------------------------- frames */

export const FRAMES = [
  { key: "bronze", label: "Bronze", level: 5 },
  { key: "silver", label: "Silver", level: 10 },
  { key: "gold", label: "Gold", level: 20 },
  { key: "emerald", label: "Emerald", level: 30 },
  { key: "sapphire", label: "Sapphire", level: 40 },
  { key: "holo", label: "Holographic", level: 50 },
  { key: "prismatic", label: "Prismatic", level: 75 },
  { key: "legendary", label: "Legendary", level: 100 },
  // Bought with tokens, at any level.
  { key: "neon", label: "Neon", item: "frame_neon" },
  { key: "pixel", label: "Pixel", item: "frame_pixel" },
  { key: "flame", label: "Flame", item: "frame_flame" },
  { key: "aurora", label: "Aurora", item: "frame_aurora" },
] as const satisfies readonly (
  | { key: string; label: string; level: number }
  | { key: string; label: string; item: string }
)[];

export type FrameKey = (typeof FRAMES)[number]["key"];
export const FRAME_KEYS = FRAMES.map((f) => f.key) as [FrameKey, ...FrameKey[]];

/** The best frame a level has earned, if any. */
export const levelFrame = (level: number): FrameKey | null => {
  let best: FrameKey | null = null;
  for (const f of FRAMES) {
    if ("level" in f && level >= f.level) best = f.key;
  }
  return best;
};

/* ------------------------------------------------------------ card themes */

export const CARD_THEMES = [
  { key: "default", label: "Default" },
  { key: "gold", label: "Gold", level: 20 },
  { key: "holo", label: "Holo", level: 50 },
  { key: "retro", label: "Retro", item: "theme_retro", badge: "collector" },
  { key: "night", label: "Night", item: "theme_night", badge: "streaker" },
  { key: "synthwave", label: "Synthwave", item: "theme_synthwave" },
] as const;

export type CardThemeKey = (typeof CARD_THEMES)[number]["key"];
export const CARD_THEME_KEYS = CARD_THEMES.map((t) => t.key) as [
  CardThemeKey,
  ...CardThemeKey[],
];

/* ----------------------------------------------------------------- badges */

/** 1 bronze, 2 silver, 3 gold, 4 platinum. */
export type Metal = 1 | 2 | 3 | 4;
export const METALS = ["bronze", "silver", "gold", "platinum"] as const;
export const METAL_XP: Record<Metal, number> = {
  1: 50,
  2: 150,
  3: 400,
  4: 1000,
};
export const METAL_TOKENS: Record<Metal, number> = { 1: 0, 2: 0, 3: 10, 4: 30 };

export const BADGE_CATEGORIES = [
  "collection",
  "completion",
  "explorer",
  "critic",
  "community",
  "curation",
  "social",
  "dedication",
  "special",
] as const;
export type BadgeCategory = (typeof BADGE_CATEGORIES)[number];

/** Every count the badges are measured by, as player_metrics returns them,
 *  plus streakBest, which the service works out. */
export const METRICS = [
  "logged",
  "rated",
  "hours",
  "finished",
  "mastered",
  "backlogSlain",
  "genres",
  "systems",
  "decades",
  "reviews",
  "reviewUpvotes",
  "posts",
  "postUpvotes",
  "lists",
  "listUpvotes",
  "gaming25",
  "gaming25Loves",
  "friends",
  "referrals",
  "streakBest",
  "quests",
  "founding",
  "binge",
  "perfectScore",
  "retiredVeteran",
] as const;
export type Metric = (typeof METRICS)[number];
export type Metrics = Record<Metric, number>;

export interface BadgeDef {
  key: string;
  name: string;
  /** What earns it, with {n} for the threshold and "(s)" on a word
   *  that is singular at 1. */
  description: string;
  category: BadgeCategory;
  /** A lucide icon name; the frontend holds the map. */
  icon: string;
  metric: Metric;
  /** In order; a badge of one tier has one, at its metal. */
  tiers: readonly { metal: Metal; at: number }[];
  /** Hidden from everyone, its owner included, until it's earned. */
  secret?: boolean;
}

const four = (a: number, b: number, c: number, d: number) =>
  [
    { metal: 1, at: a },
    { metal: 2, at: b },
    { metal: 3, at: c },
    { metal: 4, at: d },
  ] as const;

export const BADGES = [
  {
    key: "collector",
    name: "Collector",
    description: "Log {n} games",
    category: "collection",
    icon: "Library",
    metric: "logged",
    tiers: four(10, 50, 150, 500),
  },
  {
    key: "rater",
    name: "Rater",
    description: "Rate {n} games",
    category: "collection",
    icon: "Star",
    metric: "rated",
    tiers: four(10, 50, 200, 500),
  },
  {
    key: "marathoner",
    name: "Marathoner",
    description: "Log {n} hours played",
    category: "collection",
    icon: "Hourglass",
    metric: "hours",
    tiers: four(100, 500, 2000, 5000),
  },
  {
    key: "finisher",
    name: "Finisher",
    description: "Finish {n} games",
    category: "completion",
    icon: "Flag",
    metric: "finished",
    tiers: four(5, 25, 75, 200),
  },
  {
    key: "completionist",
    name: "Completionist",
    description: "Master {n} game(s)",
    category: "completion",
    icon: "Trophy",
    metric: "mastered",
    tiers: four(1, 10, 30, 100),
  },
  {
    key: "backlog_slayer",
    name: "Backlog Slayer",
    description: "Move {n} games from your backlog to played",
    category: "completion",
    icon: "Swords",
    metric: "backlogSlain",
    tiers: four(5, 20, 50, 150),
  },
  {
    key: "genre_explorer",
    name: "Genre Explorer",
    description: "Play games from {n} genres",
    category: "explorer",
    icon: "Compass",
    metric: "genres",
    tiers: four(5, 10, 15, 20),
  },
  {
    key: "platform_hopper",
    name: "Platform Hopper",
    description: "Play on {n} systems",
    category: "explorer",
    icon: "Gamepad2",
    metric: "systems",
    tiers: four(2, 4, 7, 10),
  },
  {
    key: "time_traveller",
    name: "Time Traveller",
    description: "Play games from {n} decades",
    category: "explorer",
    icon: "History",
    metric: "decades",
    tiers: four(2, 3, 4, 5),
  },
  {
    key: "critic",
    name: "Critic",
    description: "Write {n} review(s)",
    category: "critic",
    icon: "PenLine",
    metric: "reviews",
    tiers: four(1, 10, 50, 150),
  },
  {
    key: "respected",
    name: "Respected",
    description: "Get {n} upvotes on your reviews",
    category: "critic",
    icon: "ThumbsUp",
    metric: "reviewUpvotes",
    tiers: four(10, 50, 250, 1000),
  },
  {
    key: "voice",
    name: "Voice",
    description: "Post {n} time(s) in the community",
    category: "community",
    icon: "MessagesSquare",
    metric: "posts",
    tiers: four(1, 10, 50, 200),
  },
  {
    key: "crowd_favourite",
    name: "Crowd Favourite",
    description: "Get {n} upvotes in the community",
    category: "community",
    icon: "Flame",
    metric: "postUpvotes",
    tiers: four(10, 50, 250, 1000),
  },
  {
    key: "curator",
    name: "Curator",
    description: "Make {n} list(s) of 5 games or more",
    category: "curation",
    icon: "ListOrdered",
    metric: "lists",
    tiers: four(1, 3, 10, 25),
  },
  {
    key: "tastemaker",
    name: "Tastemaker",
    description: "Get {n} upvotes on your lists",
    category: "curation",
    icon: "Sparkle",
    metric: "listUpvotes",
    tiers: four(5, 25, 100, 500),
  },
  {
    key: "gaming_25",
    name: "Gaming 25",
    description: "Pick a game for all 25 categories",
    category: "curation",
    icon: "Grid3x3",
    metric: "gaming25",
    tiers: [{ metal: 3, at: 1 }],
  },
  {
    key: "beloved",
    name: "Beloved",
    description: "Get {n} loves on your Gaming 25",
    category: "curation",
    icon: "Heart",
    metric: "gaming25Loves",
    tiers: four(5, 25, 100, 500),
  },
  {
    key: "social_butterfly",
    name: "Social Butterfly",
    description: "Make {n} friend(s)",
    category: "social",
    icon: "Users",
    metric: "friends",
    tiers: four(1, 5, 15, 50),
  },
  {
    key: "recruiter",
    name: "Recruiter",
    description: "Get {n} invited friend(s) going",
    category: "social",
    icon: "UserPlus",
    metric: "referrals",
    tiers: four(1, 3, 10, 25),
  },
  {
    key: "streaker",
    name: "Streaker",
    description: "Keep a {n} week streak",
    category: "dedication",
    icon: "Zap",
    metric: "streakBest",
    tiers: four(4, 12, 26, 52),
  },
  {
    key: "quest_hunter",
    name: "Taskmaster",
    description: "Complete {n} task(s)",
    category: "dedication",
    icon: "Target",
    metric: "quests",
    tiers: four(5, 25, 75, 200),
  },
  {
    key: "founding_member",
    name: "Founding Member",
    description: "One of the first 100 members",
    category: "special",
    icon: "Crown",
    metric: "founding",
    tiers: [{ metal: 4, at: 1 }],
  },
  {
    key: "binge",
    name: "Binge",
    description: "Log 10 games in one day",
    category: "special",
    icon: "Popcorn",
    metric: "binge",
    tiers: [{ metal: 3, at: 10 }],
    secret: true,
  },
  {
    key: "perfect_score",
    name: "Perfect Score",
    description: "Rate a game 10 and review it the same day",
    category: "special",
    icon: "BadgeCheck",
    metric: "perfectScore",
    tiers: [{ metal: 3, at: 1 }],
    secret: true,
  },
  {
    key: "retired_veteran",
    name: "Retired Veteran",
    description: "Retire a game after 100 hours",
    category: "special",
    icon: "Armchair",
    metric: "retiredVeteran",
    tiers: [{ metal: 3, at: 1 }],
    secret: true,
  },
] as const satisfies readonly BadgeDef[];

export type BadgeKey = (typeof BADGES)[number]["key"];
export const BADGE_KEYS = BADGES.map((b) => b.key) as [BadgeKey, ...BadgeKey[]];

export const badgeDef = (key: string): BadgeDef | undefined =>
  (BADGES as readonly BadgeDef[]).find((b) => b.key === key);

/** The metals a count has reached. */
export const metalsReached = (badge: BadgeDef, value: number): Metal[] =>
  badge.tiers.filter((t) => value >= t.at).map((t) => t.metal);

/* ------------------------------------------------------------------ shop */

export const SHOP_KINDS = ["cosmetic", "slot", "helper"] as const;
export type ShopKind = (typeof SHOP_KINDS)[number];

export const SHOP_ITEMS = [
  { item: "frame_neon", kind: "cosmetic", label: "Neon frame" },
  { item: "frame_pixel", kind: "cosmetic", label: "Pixel frame" },
  { item: "frame_flame", kind: "cosmetic", label: "Flame frame" },
  { item: "frame_aurora", kind: "cosmetic", label: "Aurora frame" },
  { item: "theme_retro", kind: "cosmetic", label: "Retro card" },
  { item: "theme_night", kind: "cosmetic", label: "Night card" },
  { item: "theme_synthwave", kind: "cosmetic", label: "Synthwave card" },
  { item: "effect_sheen", kind: "cosmetic", label: "Banner sheen" },
  { item: "effect_glow", kind: "cosmetic", label: "Name glow" },
  { item: "layout_shelf", kind: "cosmetic", label: "Shelf showcase" },
  { item: "layout_spotlight", kind: "cosmetic", label: "Spotlight showcase" },
  { item: "slot_showcase", kind: "slot", label: "Showcase slot" },
  { item: "slot_pinned_list", kind: "slot", label: "Pinned list slot" },
  { item: "streak_shield", kind: "helper", label: "Streak shield" },
] as const;

/** A task's reroll is bought and spent in one go, on the task itself. */
export const REROLL_ITEM = "quest_reroll";

export type ShopItemKey = (typeof SHOP_ITEMS)[number]["item"];
export const SHOP_ITEM_KEYS = SHOP_ITEMS.map((i) => i.item) as [
  ShopItemKey,
  ...ShopItemKey[],
];

export const BASE_SHOWCASE_SLOTS = 5;
export const BASE_PINNED_LISTS = 1;

export const EFFECTS = ["effect_sheen", "effect_glow"] as const;
export type EffectKey = (typeof EFFECTS)[number];
export const SHOWCASE_LAYOUTS = [
  "row",
  "layout_shelf",
  "layout_spotlight",
] as const;
export type ShowcaseLayout = (typeof SHOWCASE_LAYOUTS)[number];

/* --------------------------------------------------------------- periods */

export interface Period {
  /** "w2026-44" or "m2026-10". */
  key: string;
  kind: "week" | "month";
  start: string;
  end: string;
}

/** The wall-clock offset of a zone at an instant, in minutes. */
const zoneOffset = (at: Date, timeZone: string): number => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((asUtc - at.getTime()) / 60000);
};

/** Midnight of a local date in a zone, as an instant. */
const zonedMidnight = (y: number, m: number, d: number, timeZone: string) => {
  const guess = new Date(Date.UTC(y, m, d));
  const offset = zoneOffset(guess, timeZone);
  const at = new Date(guess.getTime() - offset * 60000);
  // Once more, for a midnight that falls the other side of a clock change.
  return new Date(guess.getTime() - zoneOffset(at, timeZone) * 60000);
};

const safeZone = (timeZone: string) => {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone });
    return timeZone;
  } catch {
    return "UTC";
  }
};

/** This week (from Monday) and month, in the member's own time zone. */
export const periodsFor = (
  now: Date,
  timeZone: string,
): { week: Period; month: Period } => {
  const zone = safeZone(timeZone);
  const local = new Date(now.getTime() + zoneOffset(now, zone) * 60000);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = local.getUTCDate();
  const weekday = (local.getUTCDay() + 6) % 7;

  const monday = new Date(Date.UTC(y, m, d - weekday));
  const weekStart = zonedMidnight(
    monday.getUTCFullYear(),
    monday.getUTCMonth(),
    monday.getUTCDate(),
    zone,
  );
  const weekEnd = zonedMidnight(
    monday.getUTCFullYear(),
    monday.getUTCMonth(),
    monday.getUTCDate() + 7,
    zone,
  );
  // ISO week number, from the Thursday of this week.
  const thursday = new Date(Date.UTC(y, m, d - weekday + 3));
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  const isoWeek = Math.ceil(
    ((thursday.getTime() - yearStart) / 86400000 + 1) / 7,
  );

  return {
    week: {
      key: `w${thursday.getUTCFullYear()}-${String(isoWeek).padStart(2, "0")}`,
      kind: "week",
      start: weekStart.toISOString(),
      end: weekEnd.toISOString(),
    },
    month: {
      key: `m${y}-${String(m + 1).padStart(2, "0")}`,
      kind: "month",
      start: zonedMidnight(y, m, 1, zone).toISOString(),
      end: zonedMidnight(y, m + 1, 1, zone).toISOString(),
    },
  };
};

/* ---------------------------------------------------------------- quests */

/** The XP sources a quest counts. Each matching ledger row in the period
 *  is one step, whatever XP it carried after the daily caps. */
export interface QuestDef {
  key: string;
  label: string;
  period: "week" | "month";
  sources: readonly string[];
  target: number;
  xp: number;
}

export const QUESTS = [
  {
    key: "w_rate3",
    label: "Rate 3 games",
    period: "week",
    sources: ["rate"],
    target: 3,
    xp: 40,
  },
  {
    key: "w_finish1",
    label: "Finish a game",
    period: "week",
    sources: ["finish"],
    target: 1,
    xp: 75,
  },
  {
    key: "w_review1",
    label: "Write a review",
    period: "week",
    sources: ["review_short", "review_long"],
    target: 1,
    xp: 60,
  },
  {
    key: "w_shelve5",
    label: "Add 5 games to your backlog or wishlist",
    period: "week",
    sources: ["shelve"],
    target: 5,
    xp: 40,
  },
  {
    key: "w_post1",
    label: "Post in the community",
    period: "week",
    sources: ["thread", "reply"],
    target: 1,
    xp: 50,
  },
  {
    key: "w_play2",
    label: "Log 2 games you've played",
    period: "week",
    sources: ["play"],
    target: 2,
    xp: 50,
  },
  {
    key: "w_list",
    label: "Make a list of 5 games",
    period: "week",
    sources: ["list"],
    target: 1,
    xp: 60,
  },
  {
    key: "m_finish3",
    label: "Finish 3 games",
    period: "month",
    sources: ["finish"],
    target: 3,
    xp: 150,
  },
  {
    key: "m_review3",
    label: "Write 3 reviews",
    period: "month",
    sources: ["review_short", "review_long"],
    target: 3,
    xp: 150,
  },
  {
    key: "m_log15",
    label: "Log 15 games",
    period: "month",
    sources: ["shelve", "play"],
    target: 15,
    xp: 150,
  },
  {
    key: "m_rate10",
    label: "Rate 10 games",
    period: "month",
    sources: ["rate"],
    target: 10,
    xp: 150,
  },
  {
    key: "m_friend",
    label: "Make a friend",
    period: "month",
    sources: ["friend"],
    target: 1,
    xp: 150,
  },
  {
    key: "m_posts5",
    label: "Post 5 times in the community",
    period: "month",
    sources: ["thread", "reply"],
    target: 5,
    xp: 150,
  },
  {
    key: "m_upvotes10",
    label: "Earn 10 upvotes on your reviews or posts",
    period: "month",
    sources: ["review_upvote", "post_upvote", "list_upvote"],
    target: 10,
    xp: 150,
  },
  {
    key: "m_master1",
    label: "Master a game",
    period: "month",
    sources: ["master"],
    target: 1,
    xp: 150,
  },
] as const satisfies readonly QuestDef[];

export type QuestKey = (typeof QUESTS)[number]["key"];

/** A small, stable hash, so a member's quests are the same all period. */
const hash = (text: string): number => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/** Picks `count` from a pool in a stable order for this seed. */
const pick = <T extends { key: string }>(
  pool: T[],
  seed: string,
  count: number,
) =>
  [...pool]
    .sort((a, b) => hash(`${seed}:${a.key}`) - hash(`${seed}:${b.key}`))
    .slice(0, count);

/**
 * This period's tasks for a member: 3 a week, 3 a month, the month's a
 * longer stretch of the same kinds of thing. A swap draws its slot again
 * from the tasks not dealt, so it can't hand back the one it replaced, and
 * the other slots stay put.
 */
export const questsFor = (
  userId: string,
  period: Period,
  rerolls: Record<number, string> = {},
): QuestDef[] => {
  const pool = (QUESTS as readonly QuestDef[]).filter(
    (q) => q.period === period.kind,
  );
  const draw = (taken: QuestDef[], slot: number, reroll = "") =>
    pick(
      pool.filter((q) => !taken.some((t) => t.key === q.key)),
      `${userId}:${period.key}:${slot}:${reroll}`,
      1,
    )[0]!;
  const dealt: QuestDef[] = [];
  for (const slot of [0, 1, 2]) dealt.push(draw(dealt, slot));
  const swapped: QuestDef[] = [];
  return dealt.map((q, slot) => {
    if (!rerolls[slot]) return q;
    const next = draw([...dealt, ...swapped], slot, rerolls[slot]);
    swapped.push(next);
    return next;
  });
};

/* ----------------------------------------------------------------- types */

export interface QuestState {
  slot: number;
  key: string;
  label: string;
  target: number;
  count: number;
  xp: number;
  done: boolean;
}

export interface StreakWeek {
  /** Its Monday. */
  week: string;
  state: "active" | "shield" | "empty";
}

export interface StreakState {
  weeks: number;
  best: number;
  /** This week has an action in it already. */
  thisWeek: boolean;
  /** Free shield still unused this month. */
  freeShield: boolean;
  /** Bought shields held. */
  spareShields: number;
  /** The last 26 weeks, oldest first, for the graph. */
  history: StreakWeek[];
}

export interface XpGain {
  id: number;
  source: string;
  xp: number;
}

export interface BadgeUnlock {
  badge: string;
  metal: Metal;
  unlockedAt: string;
}

export interface Progress {
  xp: number;
  level: LevelState;
  tokens: number;
  frame: FrameKey | null;
  streak: StreakState;
  quests: { week: QuestState[]; month: QuestState[] };
  periods: { week: Period; month: Period };
  look: {
    cardTheme: CardThemeKey;
    layout: ShowcaseLayout;
    /** Unlocked, by level, badge or the shop. */
    frames: FrameKey[];
    themes: CardThemeKey[];
    showcaseSlots: number;
    pinnedListSlots: number;
  };
  /** Swapping a task: bought on the spot, one a period. */
  swap: {
    price: number;
    held: number;
    used: { week: boolean; month: boolean };
  };
  /** Not yet celebrated. */
  unseen: {
    xp: XpGain[];
    badges: BadgeUnlock[];
    tokens: number;
  };
  /** First visit since levels arrived, for a member who was here before. */
  reveal: boolean;
  referralCode: string;
}

export interface BadgeHolding {
  badge: string;
  metal: Metal;
  unlockedAt: string;
  /** Share of members holding at least this metal, 0 to 1. */
  rarity: number;
}

export interface BadgeProgress {
  badge: string;
  value: number;
}

export interface PlayerBadges {
  level: number;
  xp: number;
  frame: FrameKey | null;
  held: BadgeHolding[];
  showcase: string[];
  layout: ShowcaseLayout;
  /** Only for the owner: how far towards each badge's next metal. */
  progress?: BadgeProgress[];
}

export interface ShopEntry {
  item: ShopItemKey;
  kind: ShopKind;
  label: string;
  price: number;
  owned: number;
  maxOwned: number;
  affordable: boolean;
}

export interface Shop {
  tokens: number;
  items: ShopEntry[];
}

export interface LeaderboardRow {
  username: string;
  avatarUrl: string | null;
  accent: string;
  level: number;
  frame: FrameKey | null;
  xp: number;
  rank: number;
  isYou: boolean;
}

export interface XpRule {
  source: string;
  xp: number;
  dailyCap: number | null;
}

/* --------------------------------------------------------------- inputs */

export const LEADERBOARD_PERIODS = ["week", "month", "all"] as const;
export type LeaderboardPeriod = (typeof LEADERBOARD_PERIODS)[number];

export const LeaderboardQuerySchema = z.object({
  period: z.enum(LEADERBOARD_PERIODS).default("week"),
});

export const SeenSchema = z
  .object({
    xpEventId: z.number().int().nonnegative().optional(),
    badges: z
      .array(
        z.object({
          badge: z.string().max(40),
          metal: z.number().int().min(1).max(4),
        }),
      )
      .max(100)
      .optional(),
  })
  .strict();

export const StyleSchema = z
  .object({
    frame: z.enum(FRAME_KEYS).nullable().optional(),
    cardTheme: z.enum(CARD_THEME_KEYS).optional(),
    showcase: z.array(z.enum(BADGE_KEYS)).max(8).optional(),
    layout: z.enum(SHOWCASE_LAYOUTS).optional(),
    effects: z.array(z.enum(EFFECTS)).max(EFFECTS.length).optional(),
    pinnedLists: z.array(z.number().int().positive()).max(3).optional(),
  })
  .strict();
export type StyleInput = z.infer<typeof StyleSchema>;

export const ReferralSchema = z
  .object({ username: z.string().trim().min(1).max(40) })
  .strict();

export const ShopItemParamSchema = z.object({ item: z.enum(SHOP_ITEM_KEYS) });

export const RerollParamSchema = z.object({
  period: z.enum(["week", "month"]),
  slot: z.coerce.number().int().min(0).max(2),
});

import {
  BASE_PINNED_LISTS,
  BASE_SHOWCASE_SLOTS,
  CARD_THEMES,
  FRAMES,
  type CardThemeKey,
  type FrameKey,
} from "@playrates/shared";

/** A Monday as "YYYY-MM-DD", moved by whole weeks. */
export const shiftWeek = (day: string, weeks: number): string => {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + 7 * weeks)).toISOString().slice(0, 10);
};

const monthOf = (day: string) => day.slice(0, 7);

/** The local calendar date of an instant in a zone. */
export const localDay = (instant: string, timeZone: string): string => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date(instant))
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
};

export interface StreakInput {
  /** Mondays with something done. */
  weeks: string[];
  /** Weeks a bought shield has already covered. */
  used: string[];
  /** This week's Monday. */
  current: string;
  /** Bought shields held. */
  spare: number;
}

export interface StreakResult {
  weeks: number;
  best: number;
  thisWeek: boolean;
  /** This month's free shield is still there. */
  freeShield: boolean;
  /** A bought shield to spend on this missed week, to keep the streak. */
  spend: string | null;
  /** The missed weeks a shield is covering in the streak as it stands. */
  shielded: string[];
}

/**
 * Weeks in a row with something done. A missed week is covered by the
 * month's free shield, or a bought one already spent on it. A bought shield
 * held is only ever spent on last week: when an older miss in the same
 * month needs the free shield, the bought one takes last week instead.
 * This week counts once it has something in it, and an empty one so far
 * doesn't break anything yet.
 */
export const streakOf = ({
  weeks,
  used,
  current,
  spare,
}: StreakInput): StreakResult => {
  const active = new Set(weeks);
  const bought = new Set(used);
  const earliest = [...active].sort()[0];
  const thisWeek = active.has(current);
  if (!earliest) {
    return {
      weeks: 0,
      best: 0,
      thisWeek,
      freeShield: true,
      spend: null,
      shielded: [],
    };
  }

  // Which week each month's free shield went on.
  const freeOn = new Map<string, string>();
  let spend: string | null = null;
  let count = thisWeek ? 1 : 0;
  /* A covered gap only counts once an active week is found beyond it: one
     the streak trails off into covers nothing. */
  const pending: string[] = [];
  const shielded: string[] = [];
  const lastWeek = shiftWeek(current, -1);
  for (let w = lastWeek; w >= earliest; w = shiftWeek(w, -1)) {
    if (active.has(w)) {
      count++;
      shielded.push(...pending.splice(0));
    } else if (bought.has(w)) {
      pending.push(w);
    } else if (!freeOn.has(monthOf(w))) {
      freeOn.set(monthOf(w), w);
      pending.push(w);
    } else if (
      spend === null &&
      spare > 0 &&
      freeOn.get(monthOf(w)) === lastWeek
    ) {
      spend = lastWeek;
      freeOn.set(monthOf(w), w);
      pending.push(w);
    } else {
      break;
    }
  }

  // The longest run ever, the same rules but only shields already spent.
  let best = 0;
  let run = 0;
  const free = new Set<string>();
  for (let w = earliest; w <= current; w = shiftWeek(w, 1)) {
    if (active.has(w)) {
      run++;
      best = Math.max(best, run);
    } else if (w === current) {
      // Not over yet.
    } else if (bought.has(w)) {
      // Covered.
    } else if (run > 0 && !free.has(monthOf(w))) {
      free.add(monthOf(w));
    } else {
      run = 0;
    }
  }

  return {
    weeks: count,
    best: Math.max(best, count),
    thisWeek,
    freeShield: !freeOn.has(monthOf(current)),
    spend,
    shielded,
  };
};

/* --------------------------------------------------------------- unlocks */

export interface Owned {
  level: number;
  items: Record<string, number>;
  /** Badge keys held at gold or better. */
  gold: Set<string>;
}

export const frameUnlocked = (frame: FrameKey, owned: Owned): boolean => {
  const def = FRAMES.find((f) => f.key === frame);
  if (!def) return false;
  return "level" in def
    ? owned.level >= def.level
    : (owned.items[def.item] ?? 0) > 0;
};

export const themeUnlocked = (theme: CardThemeKey, owned: Owned): boolean => {
  const def = CARD_THEMES.find((t) => t.key === theme);
  if (!def) return false;
  if ("level" in def) return owned.level >= def.level;
  if ("item" in def) {
    return (
      (owned.items[def.item] ?? 0) > 0 ||
      ("badge" in def && owned.gold.has(def.badge))
    );
  }
  return true;
};

export const showcaseSlots = (items: Record<string, number>): number =>
  BASE_SHOWCASE_SLOTS + (items.slot_showcase ?? 0);

export const pinnedListSlots = (items: Record<string, number>): number =>
  BASE_PINNED_LISTS + (items.slot_pinned_list ?? 0);

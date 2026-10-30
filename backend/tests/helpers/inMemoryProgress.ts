import { HABIT_WEEKS, periodsFor } from "@playrates/shared";
import type { ProfileRow } from "../../src/types/database.types.js";
import {
  BuyError,
  type ProgressRepository,
} from "../../src/modules/progress/progress.repository.js";
import { localDay } from "../../src/modules/progress/progress.logic.js";
import type { InMemoryState } from "./inMemoryRepos.js";

export interface XpEventState {
  id: number;
  user_id: string;
  source: string;
  key: string;
  xp: number;
  data?: Record<string, unknown>;
  created_at: string;
}

export interface TokenEventState {
  user_id: string;
  source: string;
  key: string;
  amount: number;
}

/** The rules as the migrations leave them; the triggers aren't in play
 *  here, so a test writes the ledger through awardXp as they would. */
const RULES: Record<string, { xp: number; active: boolean }> = {
  shelve: { xp: 1, active: true },
  play: { xp: 10, active: true },
  finish: { xp: 20, active: true },
  master: { xp: 40, active: true },
  rate: { xp: 5, active: true },
  review_short: { xp: 15, active: true },
  review_long: { xp: 30, active: true },
  review_upvote: { xp: 3, active: false },
  thread: { xp: 10, active: true },
  reply: { xp: 5, active: true },
  friend: { xp: 15, active: true },
  list: { xp: 20, active: true },
  streak: { xp: 0, active: false },
  quest: { xp: 0, active: false },
  badge: { xp: 0, active: false },
  setup: { xp: 150, active: false },
  referral_joined: { xp: 50, active: false },
  referral_active: { xp: 250, active: false },
  referral_welcome: { xp: 100, active: false },
};

const SHOP: Record<
  string,
  { kind: string; price: number; step: number; max: number }
> = {
  frame_neon: { kind: "cosmetic", price: 120, step: 0, max: 1 },
  theme_retro: { kind: "cosmetic", price: 150, step: 0, max: 1 },
  font_pixel: { kind: "name", price: 200, step: 0, max: 1 },
  colour_ember: { kind: "name", price: 75, step: 0, max: 1 },
  react_goat: { kind: "reaction", price: 100, step: 0, max: 1 },
  slot_pinned_review: { kind: "slot", price: 100, step: 50, max: 3 },
  slot_showcase: { kind: "slot", price: 150, step: 75, max: 4 },
  slot_pinned_list: { kind: "slot", price: 150, step: 150, max: 2 },
  streak_shield: { kind: "helper", price: 60, step: 0, max: 2 },
};

/**
 * The progress repository over plain arrays. Totals are summed from the
 * ledgers as the database's triggers keep them, and the counts badges read
 * come from `state.progressMetrics`, which a test sets for the member.
 */
export const createInMemoryProgress = (
  state: InMemoryState,
): ProgressRepository => {
  let nextId = 1;

  const countIn = (userId: string, from: string, to: string) => {
    const counts: Record<string, number> = {};
    for (const e of state.xpEvents) {
      if (e.user_id !== userId || e.created_at < from || e.created_at >= to)
        continue;
      if (e.data?.revoked) continue;
      counts[e.source] = (counts[e.source] ?? 0) + 1;
    }
    return counts;
  };

  const weeksOf = (userId: string) => {
    const row = state.profiles.find((p) => p.id === userId);
    const zone = row?.timezone || "UTC";
    const weeks = new Set<string>();
    for (const e of state.xpEvents) {
      if (e.user_id !== userId || !RULES[e.source]?.active) continue;
      if (e.data?.revoked) continue;
      weeks.add(
        localDay(periodsFor(new Date(e.created_at), zone).week.start, zone),
      );
    }
    return [...weeks].sort().reverse();
  };

  const weeksBefore = (instant: string, weeks: number) =>
    new Date(Date.parse(instant) - weeks * 7 * 86400000).toISOString();

  const withTotals = (row: ProfileRow): ProfileRow => ({
    ...row,
    xp: state.xpEvents
      .filter((e) => e.user_id === row.id)
      .reduce((n, e) => n + e.xp, 0),
    tokens: state.tokenEvents
      .filter((e) => e.user_id === row.id)
      .reduce((n, e) => n + e.amount, 0),
  });

  return {
    async profile(userId) {
      const row = state.profiles.find((p) => p.id === userId);
      return row ? withTotals(row) : null;
    },

    async profilesByIds(ids) {
      return state.profiles.filter((p) => ids.includes(p.id)).map(withTotals);
    },

    async profileIds(after, limit) {
      return state.profiles
        .map((p) => p.id)
        .sort()
        .filter((id) => after === null || id > after)
        .slice(0, limit);
    },

    async metrics(userId) {
      return { ...(state.progressMetrics.get(userId) ?? {}) };
    },

    async weeks(userId) {
      return weeksOf(userId);
    },

    async shieldsUsed(userId) {
      return state.shieldsUsed
        .filter((s) => s.user_id === userId)
        .map((s) => s.week);
    },

    async recordShield(userId, week) {
      state.shieldsUsed.push({ user_id: userId, week });
    },

    async badges(userId) {
      return state.userBadges
        .filter((b) => b.user_id === userId)
        .map(({ badge, metal, unlocked_at, seen_at }) => ({
          badge,
          metal,
          unlocked_at,
          seen_at,
        }));
    },

    async unlockBadge(userId, badge, metal) {
      if (
        !state.userBadges.some(
          (b) => b.user_id === userId && b.badge === badge && b.metal === metal,
        )
      ) {
        state.userBadges.push({
          user_id: userId,
          badge,
          metal,
          unlocked_at: new Date().toISOString(),
          seen_at: null,
        });
      }
    },

    async markBadgesSeen(userId, badges) {
      for (const b of state.userBadges) {
        if (
          b.user_id === userId &&
          badges.some((s) => s.badge === b.badge && s.metal === b.metal)
        ) {
          b.seen_at ??= new Date().toISOString();
        }
      }
    },

    async awardXp(userId, source, key, xp, data) {
      if (state.xpEvents.some((e) => e.user_id === userId && e.key === key))
        return;
      const amount = xp ?? RULES[source]?.xp ?? 0;
      state.xpEvents.push({
        id: nextId++,
        user_id: userId,
        source,
        key,
        xp: amount,
        data,
        created_at: new Date().toISOString(),
      });
      // As the trigger on xp_events keeps the profile's total.
      const row = state.profiles.find((p) => p.id === userId);
      if (row) row.xp = (row.xp ?? 0) + amount;
    },

    async awardTokens(userId, source, key, amount) {
      if (state.tokenEvents.some((e) => e.user_id === userId && e.key === key))
        return;
      state.tokenEvents.push({ user_id: userId, source, key, amount });
    },

    async tokenKeys(userId, prefix) {
      return new Set(
        state.tokenEvents
          .filter((e) => e.user_id === userId && e.key.startsWith(prefix))
          .map((e) => e.key),
      );
    },

    async xpAwarded(userId, keys) {
      return new Map(
        state.xpEvents
          .filter((e) => e.user_id === userId && keys.includes(e.key))
          .map((e) => [e.key, e.xp]),
      );
    },

    async paidTokenKeys(userId, keys) {
      return new Set(
        state.tokenEvents
          .filter((e) => e.user_id === userId && keys.includes(e.key))
          .map((e) => e.key),
      );
    },

    async countSources(userId, from, to) {
      return countIn(userId, from, to);
    },

    async unseenXp(userId, afterId) {
      return state.xpEvents
        .filter((e) => e.user_id === userId && e.id > afterId && e.xp > 0)
        .map(({ id, source, xp }) => ({ id, source, xp }));
    },

    async setSeenXp(userId, upToId) {
      const row = state.profiles.find((p) => p.id === userId);
      if (row && row.xp_seen_event_id < upToId) row.xp_seen_event_id = upToId;
    },

    async setRevealed(userId) {
      const row = state.profiles.find((p) => p.id === userId);
      if (row) row.revealed_at ??= new Date().toISOString();
    },

    async items(userId) {
      return Object.fromEntries(
        state.userItems
          .filter((i) => i.user_id === userId)
          .map((i) => [i.item, i.quantity]),
      );
    },

    async shopItems() {
      return Object.entries(SHOP).map(([item, s]) => ({
        item,
        kind: s.kind,
        price: s.price,
        price_step: s.step,
        max_owned: s.max,
      }));
    },

    async buy(userId, item) {
      const def = SHOP[item];
      if (!def) throw new BuyError("unknown_item");
      const owned =
        state.userItems.find((i) => i.user_id === userId && i.item === item)
          ?.quantity ?? 0;
      if (owned >= def.max) throw new BuyError("max_owned");
      const cost = def.price + (def.kind === "slot" ? def.step * owned : 0);
      const balance = state.tokenEvents
        .filter((e) => e.user_id === userId)
        .reduce((n, e) => n + e.amount, 0);
      if (balance < cost) throw new BuyError("insufficient_tokens");
      state.tokenEvents.push({
        user_id: userId,
        source: "purchase",
        key: `buy:${item}:${nextId++}`,
        amount: -cost,
      });
      const row = state.userItems.find(
        (i) => i.user_id === userId && i.item === item,
      );
      if (row) row.quantity++;
      else state.userItems.push({ user_id: userId, item, quantity: 1 });
      return { tokens: balance - cost, owned: owned + 1 };
    },

    async useItem(userId, item) {
      const row = state.userItems.find(
        (i) => i.user_id === userId && i.item === item,
      );
      if (!row || row.quantity === 0) return false;
      row.quantity--;
      return true;
    },

    async grantBackgroundCredit(userId) {
      if (
        state.tokenEvents.some(
          (e) => e.user_id === userId && e.key === "background_unlock",
        )
      )
        return false;
      state.tokenEvents.push({
        user_id: userId,
        source: "background_unlock",
        key: "background_unlock",
        amount: 0,
      });
      const row = state.userItems.find(
        (i) => i.user_id === userId && i.item === "background_credit",
      );
      if (row) row.quantity++;
      else
        state.userItems.push({
          user_id: userId,
          item: "background_credit",
          quantity: 1,
        });
      return true;
    },

    // As buy_background does it: the free credit first, then tokens.
    async buyBackground(userId, gameId, url) {
      if (
        state.userBackgrounds.some((b) => b.user_id === userId && b.url === url)
      )
        throw new BuyError("owned");
      const fromGame = state.userBackgrounds.filter(
        (b) => b.user_id === userId && b.game_id === gameId,
      ).length;
      const balance = state.tokenEvents
        .filter((e) => e.user_id === userId)
        .reduce((n, e) => n + e.amount, 0);
      const credit = state.userItems.find(
        (i) =>
          i.user_id === userId &&
          i.item === "background_credit" &&
          i.quantity > 0,
      );
      let cost = 0;
      if (credit) credit.quantity--;
      else {
        cost = 25 + 10 * fromGame;
        if (balance < cost) throw new BuyError("insufficient_tokens");
        state.tokenEvents.push({
          user_id: userId,
          source: "purchase",
          key: `background:${nextId++}`,
          amount: -cost,
        });
      }
      state.userBackgrounds.push({
        user_id: userId,
        game_id: gameId,
        url,
        price: cost,
      });
      return { tokens: balance - cost, cost };
    },

    async favouriteCount(userId) {
      return state.favouriteGames.filter((f) => f.user_id === userId).length;
    },

    async holdings(userIds, item) {
      return new Map(
        state.userItems
          .filter((i) => i.item === item && userIds.includes(i.user_id))
          .map((i) => [i.user_id, i.quantity]),
      );
    },

    // As gift_item does it: the giver pays what the recipient would.
    async gift(giverId, recipientId, item) {
      const def = SHOP[item];
      if (!def) throw new BuyError("unknown_item");
      const have =
        state.userItems.find(
          (i) => i.user_id === recipientId && i.item === item,
        )?.quantity ?? 0;
      if (have >= def.max) throw new BuyError("max_owned");
      const cost = def.price + (def.kind === "slot" ? def.step * have : 0);
      const balance = state.tokenEvents
        .filter((e) => e.user_id === giverId)
        .reduce((n, e) => n + e.amount, 0);
      if (balance < cost) throw new BuyError("insufficient_tokens");
      state.tokenEvents.push({
        user_id: giverId,
        source: "gift",
        key: `gift:${item}:${nextId++}`,
        amount: -cost,
      });
      const row = state.userItems.find(
        (i) => i.user_id === recipientId && i.item === item,
      );
      if (row) row.quantity++;
      else state.userItems.push({ user_id: recipientId, item, quantity: 1 });
      return { tokens: balance - cost, cost };
    },

    async ownedBackgrounds(userId) {
      return state.userBackgrounds
        .filter((b) => b.user_id === userId)
        .map((b) => {
          const game = state.games.find((g) => g.id === b.game_id);
          return {
            game_id: b.game_id,
            url: b.url,
            title: game?.title ?? "",
            cover_url: game?.box_art_url ?? game?.cover_url ?? null,
          };
        });
    },

    async swaps(userId, period) {
      return state.taskSwaps
        .filter((s) => s.user_id === userId && s.period === period)
        .map(({ slot, quest }) => ({ slot, quest }));
    },

    async recordSwap(userId, period, slot, quest) {
      if (
        state.taskSwaps.some(
          (s) => s.user_id === userId && s.period === period,
        )
      )
        return false;
      state.taskSwaps.push({ user_id: userId, period, slot, quest });
      return true;
    },

    // As nudge_candidates reads them, each member in their own periods.
    async nudgeCandidates(since, now) {
      return state.profiles
        .filter((p) => p.last_seen_at >= since)
        .map((p) => {
          const zone = p.timezone || "UTC";
          const { week, month } = periodsFor(new Date(now), zone);
          return {
            userId: p.id,
            timezone: zone,
            weeks: weeksOf(p.id),
            shields: state.shieldsUsed
              .filter((s) => s.user_id === p.id)
              .map((s) => s.week),
            spare:
              state.userItems.find(
                (i) => i.user_id === p.id && i.item === "streak_shield",
              )?.quantity ?? 0,
            weekCounts: countIn(p.id, week.start, now),
            monthCounts: countIn(p.id, month.start, now),
            weekHabits: countIn(
              p.id,
              weeksBefore(week.start, HABIT_WEEKS),
              week.start,
            ),
            monthHabits: countIn(
              p.id,
              weeksBefore(month.start, HABIT_WEEKS),
              month.start,
            ),
            swaps: state.taskSwaps
              .filter((s) => s.user_id === p.id && s.period === week.key)
              .map(({ period, slot, quest }) => ({ period, slot, quest })),
          };
        });
    },

    async rules() {
      return Object.entries(RULES).map(([source, r]) => ({
        source,
        xp: r.xp,
        daily_cap: null,
        active: r.active,
      }));
    },

    async xpSince(userIds, since) {
      return new Map(
        userIds.map((id) => [
          id,
          state.xpEvents
            .filter(
              (e) =>
                e.user_id === id && e.created_at >= since && !e.data?.launch,
            )
            .reduce((n, e) => n + e.xp, 0),
        ]),
      );
    },

    async holders() {
      const counts = new Map<string, Set<string>>();
      for (const b of state.userBadges) {
        const key = `${b.badge}:${b.metal}`;
        counts.set(key, (counts.get(key) ?? new Set()).add(b.user_id));
      }
      return [...counts].map(([key, users]) => {
        const [badge, metal] = key.split(":") as [string, string];
        return { badge, metal: Number(metal), holders: users.size };
      });
    },

    async memberCount() {
      return state.profiles.length;
    },

    async updateProfile(userId, patch) {
      const row = state.profiles.find((p) => p.id === userId);
      if (row) Object.assign(row, patch);
    },
  };
};

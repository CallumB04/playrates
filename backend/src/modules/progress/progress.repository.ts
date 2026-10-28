import type { Db } from "../../config/supabase.js";
import type { ProfileRow } from "../../types/database.types.js";

export interface BadgeRow {
  badge: string;
  metal: number;
  unlocked_at: string;
  seen_at: string | null;
}

export interface ShopItemRow {
  item: string;
  kind: string;
  price: number;
  price_step: number;
  max_owned: number;
}

export interface XpGainRow {
  id: number;
  source: string;
  xp: number;
}

export interface RuleRow {
  source: string;
  xp: number;
  daily_cap: number | null;
  active: boolean;
}

/** Why a purchase was refused, as buy_item raises it. */
export type BuyRefusal = "unknown_item" | "max_owned" | "insufficient_tokens";

export class BuyError extends Error {
  constructor(readonly reason: BuyRefusal) {
    super(reason);
  }
}

export interface ProgressRepository {
  profile(userId: string): Promise<ProfileRow | null>;
  profilesByIds(ids: string[]): Promise<ProfileRow[]>;
  metrics(userId: string): Promise<Record<string, number>>;
  /** Mondays, in the member's zone, of the weeks with something done. */
  weeks(userId: string): Promise<string[]>;
  shieldsUsed(userId: string): Promise<string[]>;
  recordShield(userId: string, week: string): Promise<void>;
  badges(userId: string): Promise<BadgeRow[]>;
  unlockBadge(userId: string, badge: string, metal: number): Promise<void>;
  markBadgesSeen(
    userId: string,
    badges: { badge: string; metal: number }[],
  ): Promise<void>;
  awardXp(
    userId: string,
    source: string,
    key: string,
    xp?: number,
    data?: Record<string, unknown>,
  ): Promise<void>;
  awardTokens(
    userId: string,
    source: string,
    key: string,
    amount: number,
  ): Promise<void>;
  tokenKeys(userId: string, prefix: string): Promise<Set<string>>;
  /** Ledger rows per source between two instants. */
  countSources(
    userId: string,
    from: string,
    to: string,
  ): Promise<Record<string, number>>;
  unseenXp(userId: string, afterId: number): Promise<XpGainRow[]>;
  setSeenXp(userId: string, upToId: number): Promise<void>;
  setRevealed(userId: string): Promise<void>;
  items(userId: string): Promise<Record<string, number>>;
  shopItems(): Promise<ShopItemRow[]>;
  /** Throws BuyError when refused. */
  buy(userId: string, item: string): Promise<{ tokens: number; owned: number }>;
  /** False when there was none to use. */
  useItem(userId: string, item: string): Promise<boolean>;
  rerolls(userId: string, period: string): Promise<Record<number, string>>;
  addReroll(
    userId: string,
    period: string,
    slot: number,
    seed: string,
  ): Promise<void>;
  rules(): Promise<RuleRow[]>;
  xpSince(userIds: string[], since: string): Promise<Map<string, number>>;
  holders(): Promise<{ badge: string; metal: number; holders: number }[]>;
  memberCount(): Promise<number>;
  updateProfile(userId: string, patch: Partial<ProfileRow>): Promise<void>;
}

export const createProgressRepository = (db: Db): ProgressRepository => {
  const rpc = async <T>(fn: string, args: Record<string, unknown>) => {
    const { data, error } = await db.rpc(fn, args);
    if (error) throw error;
    return data as T;
  };

  return {
    async profile(userId) {
      const { data, error } = await db
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return (data as ProfileRow | null) ?? null;
    },

    async profilesByIds(ids) {
      if (ids.length === 0) return [];
      const { data, error } = await db
        .from("profiles")
        .select("*")
        .in("id", ids);
      if (error) throw error;
      return (data ?? []) as ProfileRow[];
    },

    metrics: (userId) =>
      rpc<Record<string, number>>("player_metrics", { p_user: userId }),

    async weeks(userId) {
      const rows = await rpc<{ week: string }[]>("player_weeks", {
        p_user: userId,
      });
      return (rows ?? []).map((r) => r.week);
    },

    async shieldsUsed(userId) {
      const { data, error } = await db
        .from("streak_shields_used")
        .select("week")
        .eq("user_id", userId);
      if (error) throw error;
      return ((data ?? []) as { week: string }[]).map((r) => r.week);
    },

    async recordShield(userId, week) {
      const { error } = await db
        .from("streak_shields_used")
        .upsert({ user_id: userId, week }, { ignoreDuplicates: true });
      if (error) throw error;
    },

    async badges(userId) {
      const { data, error } = await db
        .from("user_badges")
        .select("badge, metal, unlocked_at, seen_at")
        .eq("user_id", userId);
      if (error) throw error;
      return (data ?? []) as BadgeRow[];
    },

    async unlockBadge(userId, badge, metal) {
      const { error } = await db
        .from("user_badges")
        .upsert(
          { user_id: userId, badge, metal },
          { onConflict: "user_id,badge,metal", ignoreDuplicates: true },
        );
      if (error) throw error;
    },

    async markBadgesSeen(userId, badges) {
      for (const { badge, metal } of badges) {
        const { error } = await db
          .from("user_badges")
          .update({ seen_at: new Date().toISOString() })
          .eq("user_id", userId)
          .eq("badge", badge)
          .eq("metal", metal)
          .is("seen_at", null);
        if (error) throw error;
      }
    },

    async awardXp(userId, source, key, xp, data) {
      await rpc("award_xp", {
        p_user: userId,
        p_source: source,
        p_key: key,
        p_data: data ?? {},
        p_xp: xp ?? null,
      });
    },

    async awardTokens(userId, source, key, amount) {
      await rpc("award_tokens", {
        p_user: userId,
        p_source: source,
        p_key: key,
        p_amount: amount,
      });
    },

    async tokenKeys(userId, prefix) {
      const { data, error } = await db
        .from("token_events")
        .select("key")
        .eq("user_id", userId)
        .like("key", `${prefix}%`);
      if (error) throw error;
      return new Set(((data ?? []) as { key: string }[]).map((r) => r.key));
    },

    async countSources(userId, from, to) {
      const { data, error } = await db
        .from("xp_events")
        .select("source")
        .eq("user_id", userId)
        .gte("created_at", from)
        .lt("created_at", to);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const { source } of (data ?? []) as { source: string }[]) {
        counts[source] = (counts[source] ?? 0) + 1;
      }
      return counts;
    },

    async unseenXp(userId, afterId) {
      const { data, error } = await db
        .from("xp_events")
        .select("id, source, xp")
        .eq("user_id", userId)
        .gt("id", afterId)
        .gt("xp", 0)
        .order("id");
      if (error) throw error;
      return (data ?? []) as XpGainRow[];
    },

    async setSeenXp(userId, upToId) {
      const { error } = await db
        .from("profiles")
        .update({ xp_seen_event_id: upToId })
        .eq("id", userId)
        .lt("xp_seen_event_id", upToId);
      if (error) throw error;
    },

    async setRevealed(userId) {
      const { error } = await db
        .from("profiles")
        .update({ revealed_at: new Date().toISOString() })
        .eq("id", userId)
        .is("revealed_at", null);
      if (error) throw error;
    },

    async items(userId) {
      const { data, error } = await db
        .from("user_items")
        .select("item, quantity")
        .eq("user_id", userId);
      if (error) throw error;
      return Object.fromEntries(
        ((data ?? []) as { item: string; quantity: number }[]).map((r) => [
          r.item,
          r.quantity,
        ]),
      );
    },

    async shopItems() {
      const { data, error } = await db
        .from("shop_items")
        .select("item, kind, price, price_step, max_owned")
        .eq("active", true);
      if (error) throw error;
      return (data ?? []) as ShopItemRow[];
    },

    async buy(userId, item) {
      const { data, error } = await db.rpc("buy_item", {
        p_user: userId,
        p_item: item,
      });
      if (error) {
        const reason = (
          ["unknown_item", "max_owned", "insufficient_tokens"] as const
        ).find((r) => error.message.includes(r));
        if (reason) throw new BuyError(reason);
        throw error;
      }
      return data as { tokens: number; owned: number };
    },

    async useItem(userId, item) {
      const { error } = await db.rpc("use_item", {
        p_user: userId,
        p_item: item,
      });
      if (error) {
        if (error.message.includes("none_left")) return false;
        throw error;
      }
      return true;
    },

    async rerolls(userId, period) {
      const { data, error } = await db
        .from("quest_rerolls")
        .select("slot, seed")
        .eq("user_id", userId)
        .eq("period", period);
      if (error) throw error;
      return Object.fromEntries(
        ((data ?? []) as { slot: number; seed: string }[]).map((r) => [
          r.slot,
          r.seed,
        ]),
      );
    },

    async addReroll(userId, period, slot, seed) {
      const { error } = await db
        .from("quest_rerolls")
        .insert({ user_id: userId, period, slot, seed });
      if (error) throw error;
    },

    async rules() {
      const { data, error } = await db
        .from("xp_rules")
        .select("source, xp, daily_cap, active")
        .order("xp", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RuleRow[];
    },

    async xpSince(userIds, since) {
      const rows = await rpc<{ user_id: string; xp: number }[]>("xp_since", {
        p_users: userIds,
        p_since: since,
      });
      return new Map((rows ?? []).map((r) => [r.user_id, Number(r.xp)]));
    },

    async holders() {
      const rows = await rpc<
        { badge: string; metal: number; holders: number }[]
      >("badge_holders", {});
      return (rows ?? []).map((r) => ({ ...r, holders: Number(r.holders) }));
    },

    async memberCount() {
      const { count, error } = await db
        .from("profiles")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },

    async updateProfile(userId, patch) {
      const { error } = await db
        .from("profiles")
        .update(patch)
        .eq("id", userId);
      if (error) throw error;
    },
  };
};

import { randomUUID } from "node:crypto";
import {
  BADGES,
  CARD_THEME_KEYS,
  FRAME_KEYS,
  levelFor,
  levelFrame,
  levelTokens,
  METAL_TOKENS,
  METAL_XP,
  metalsReached,
  periodsFor,
  questsFor,
  REROLL_ITEM,
  SHOP_ITEMS,
  type BadgeDef,
  type CardThemeKey,
  type FrameKey,
  type LeaderboardPeriod,
  type LeaderboardRow,
  type Metal,
  type Metric,
  type Period,
  type PlayerBadges,
  type Progress,
  type QuestState,
  type Shop,
  type ShowcaseLayout,
  type StreakWeek,
  type StyleInput,
  type XpRule,
} from "@playrates/shared";
import { AppError } from "../../lib/AppError.js";
import type { ProfileRow } from "../../types/database.types.js";
import type { FriendsRepository } from "../friends/friends.repository.js";
import type { ListsRepository } from "../lists/lists.repository.js";
import type { NotificationsRepository } from "../notifications/notifications.repository.js";
import type { ProfilesRepository } from "../profiles/profiles.repository.js";
import { toAccent } from "../profiles/profiles.mapper.js";
import {
  frameUnlocked,
  localDay,
  pinnedListSlots,
  shiftWeek,
  showcaseSlots,
  streakOf,
  themeUnlocked,
} from "./progress.logic.js";
import type { PlayerCardSource } from "./progress.image.js";
import { BuyError, type ProgressRepository } from "./progress.repository.js";

/** A member from before progress starts with tokens for the levels their
 *  history reached, up to this, so they start rich but not done. */
export const LAUNCH_TOKEN_CAP = 300;
/** Logs that make an invited friend count as getting going. */
export const REFERRAL_ACTIVE_LOGS = 5;
const REFERRAL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const ALL_BADGES = BADGES as readonly BadgeDef[];

const zoneOf = (row: ProfileRow) => row.timezone || "UTC";

export const createProgressService = (
  repo: ProgressRepository,
  profiles: ProfilesRepository,
  friends: FriendsRepository,
  lists: ListsRepository,
  notifications: NotificationsRepository,
) => {
  const mustProfile = async (userId: string) => {
    const row = await repo.profile(userId);
    if (!row) throw AppError.notFound("Profile");
    return row;
  };

  const goldBadges = async (userId: string) =>
    new Set(
      (await repo.badges(userId))
        .filter((b) => b.metal >= 3)
        .map((b) => b.badge),
    );

  /** What a member wears, and what they could. */
  const lookOf = (
    row: ProfileRow,
    items: Record<string, number>,
    badges: { badge: string; metal: number }[],
  ): Progress["look"] => {
    const owned = {
      level: levelFor(row.xp).level,
      items,
      gold: new Set(badges.filter((b) => b.metal >= 3).map((b) => b.badge)),
    };
    return {
      cardTheme: (row.card_theme as CardThemeKey | null) ?? "default",
      layout: (row.showcase_layout as ShowcaseLayout | null) ?? "row",
      frames: FRAME_KEYS.filter((f) => frameUnlocked(f, owned)),
      themes: CARD_THEME_KEYS.filter((t) => themeUnlocked(t, owned)),
      showcaseSlots: showcaseSlots(items),
      pinnedListSlots: pinnedListSlots(items),
    };
  };

  /** This period's quests, counted from the ledger. */
  const questStates = async (
    userId: string,
    period: Period,
  ): Promise<QuestState[]> => {
    const [rerolls, counts] = await Promise.all([
      repo.rerolls(userId, period.key),
      repo.countSources(userId, period.start, period.end),
    ]);
    return questsFor(userId, period, rerolls).map((q, slot) => {
      const count = Math.min(
        q.target,
        q.sources.reduce((n, s) => n + (counts[s] ?? 0), 0),
      );
      return {
        slot,
        key: q.key,
        label: q.label,
        target: q.target,
        count,
        xp: q.xp,
        done: count >= q.target,
      };
    });
  };

  /** The last 26 weeks, oldest first, for the streak's graph. */
  const historyOf = async (
    row: ProfileRow,
    week: Period,
    shielded: string[],
  ): Promise<StreakWeek[]> => {
    const active = new Set(await repo.weeks(row.id));
    const covered = new Set(shielded);
    const current = localDay(week.start, zoneOf(row));
    return Array.from({ length: 26 }, (_, i) => {
      const w = shiftWeek(current, i - 25);
      return {
        week: w,
        state: active.has(w) ? "active" : covered.has(w) ? "shield" : "empty",
      };
    });
  };

  const streakFor = async (row: ProfileRow, week: Period, spare: number) => {
    const [weeks, used] = await Promise.all([
      repo.weeks(row.id),
      repo.shieldsUsed(row.id),
    ]);
    return streakOf({
      weeks,
      used,
      current: localDay(week.start, zoneOf(row)),
      spare,
    });
  };

  return {
    /**
     * Brings a member's progress up to date and says what's new: badges
     * earned, the streak, quests done, a referral that got going, and the
     * tokens for all of it. Every award is keyed, so running it twice in a
     * row pays nothing more the second time.
     */
    async evaluate(userId: string, now = new Date()): Promise<Progress> {
      let row = await mustProfile(userId);
      const zone = zoneOf(row);
      const periods = periodsFor(now, zone);
      const launch = row.revealed_at === null;

      /* Tokens are gathered first: on a launch run they're paid as one
         capped sum, each source keyed at 0 so it isn't paid again. */
      const grants: { source: string; key: string; amount: number }[] = [];
      const grant = (source: string, key: string, amount: number) => {
        if (amount > 0) grants.push({ source, key, amount });
      };

      // The streak, spending a bought shield if it would end otherwise.
      let items = await repo.items(userId);
      let streak = await streakFor(row, periods.week, items.streak_shield ?? 0);
      if (streak.spend && (await repo.useItem(userId, "streak_shield"))) {
        await repo.recordShield(userId, streak.spend);
        items = await repo.items(userId);
        streak = await streakFor(row, periods.week, items.streak_shield ?? 0);
      }
      if (streak.thisWeek && streak.weeks > 0) {
        await repo.awardXp(
          userId,
          "streak",
          `streak:${periods.week.key}`,
          Math.min(70, 20 + 5 * streak.weeks),
        );
      }

      // Quests, and their tokens.
      const week = await questStates(userId, periods.week);
      const month = await questStates(userId, periods.month);
      for (const [period, quests] of [
        [periods.week, week],
        [periods.month, month],
      ] as const) {
        for (const q of quests.filter((q) => q.done)) {
          await repo.awardXp(
            userId,
            "quest",
            `quest:${period.key}:${q.key}`,
            q.xp,
          );
        }
      }
      if (week.every((q) => q.done))
        grant("quests", `quests:${periods.week.key}`, 5);
      if (month.every((q) => q.done)) {
        grant("quests", `quests:${periods.month.key}`, 15);
      }

      // Badges, from counts the database keeps and the streak's best.
      const metrics = (await repo.metrics(userId)) as Record<Metric, number>;
      metrics.streakBest = streak.best;
      const held = new Set(
        (await repo.badges(userId)).map((b) => `${b.badge}:${b.metal}`),
      );
      for (const badge of ALL_BADGES) {
        for (const metal of metalsReached(badge, metrics[badge.metric] ?? 0)) {
          if (held.has(`${badge.key}:${metal}`)) continue;
          await repo.unlockBadge(userId, badge.key, metal);
          await repo.awardXp(
            userId,
            "badge",
            `badge:${badge.key}:${metal}`,
            METAL_XP[metal],
            // History's badges: the leaderboard leaves these out.
            launch ? { launch: true } : undefined,
          );
          grant("badge", `badge:${badge.key}:${metal}`, METAL_TOKENS[metal]);
        }
      }

      // An invited friend who got going pays both ends, once.
      if (row.referred_by && metrics.logged >= REFERRAL_ACTIVE_LOGS) {
        await repo.awardXp(
          row.referred_by,
          "referral_active",
          `ref:${userId}:active`,
        );
        await repo.awardTokens(
          row.referred_by,
          "referral",
          `ref:${userId}`,
          25,
        );
        await repo.awardXp(userId, "referral_welcome", "ref:welcome");
      }

      // Levels, after everything above has landed.
      row = await mustProfile(userId);
      const level = levelFor(row.xp);
      const paidLevels = await repo.tokenKeys(userId, "level:");
      for (let n = 2; n <= level.level; n++) {
        if (!paidLevels.has(`level:${n}`))
          grant("level", `level:${n}`, levelTokens(n));
      }

      let gained = 0;
      if (launch) {
        // Once: a second run before the reveal has played pays nothing new.
        const paid = (await repo.tokenKeys(userId, "launch")).size > 0;
        for (const g of grants)
          await repo.awardTokens(userId, g.source, g.key, 0);
        if (!paid) {
          gained = Math.min(
            LAUNCH_TOKEN_CAP,
            grants.reduce((n, g) => n + g.amount, 0),
          );
          if (gained > 0) {
            await repo.awardTokens(userId, "launch", "launch", gained);
          }
        }
      } else {
        for (const g of grants) {
          await repo.awardTokens(userId, g.source, g.key, g.amount);
          gained += g.amount;
        }
      }

      row = await mustProfile(userId);
      const [unseenXp, badges, catalogue, weekSwaps, monthSwaps] =
        await Promise.all([
          launch
            ? Promise.resolve([])
            : repo.unseenXp(userId, row.xp_seen_event_id),
          repo.badges(userId),
          repo.shopItems(),
          repo.rerolls(userId, periods.week.key),
          repo.rerolls(userId, periods.month.key),
        ]);

      return {
        xp: row.xp,
        level: levelFor(row.xp),
        tokens: row.tokens,
        frame:
          (row.frame as FrameKey | null) ?? levelFrame(levelFor(row.xp).level),
        streak: {
          weeks: streak.weeks,
          best: streak.best,
          thisWeek: streak.thisWeek,
          freeShield: streak.freeShield,
          spareShields: items.streak_shield ?? 0,
          history: await historyOf(row, periods.week, streak.shielded),
        },
        // Read again, so quests done just now show as done.
        quests: {
          week: await questStates(userId, periods.week),
          month: await questStates(userId, periods.month),
        },
        periods,
        look: lookOf(row, items, badges),
        swap: {
          price: catalogue.find((c) => c.item === REROLL_ITEM)?.price ?? 0,
          held: items[REROLL_ITEM] ?? 0,
          used: {
            week: Object.keys(weekSwaps).length > 0,
            month: Object.keys(monthSwaps).length > 0,
          },
        },
        unseen: {
          xp: unseenXp.map((e) => ({ id: e.id, source: e.source, xp: e.xp })),
          badges: badges
            .filter((b) => b.seen_at === null)
            .map((b) => ({
              badge: b.badge,
              metal: b.metal as Metal,
              unlockedAt: b.unlocked_at,
            })),
          tokens: gained,
        },
        reveal: launch,
        referralCode: row.username,
      };
    },

    async markSeen(
      userId: string,
      input: {
        xpEventId?: number;
        badges?: { badge: string; metal: number }[];
      },
    ) {
      if (input.xpEventId) await repo.setSeenXp(userId, input.xpEventId);
      if (input.badges?.length) await repo.markBadgesSeen(userId, input.badges);
    },

    async markRevealed(userId: string) {
      const row = await mustProfile(userId);
      await repo.setRevealed(userId);
      // The history is the reveal's: none of it comes back as toasts.
      const unseen = await repo.unseenXp(userId, row.xp_seen_event_id);
      const last = unseen.at(-1);
      if (last) await repo.setSeenXp(userId, last.id);
    },

    async rules(): Promise<XpRule[]> {
      return (await repo.rules())
        .filter((r) => r.xp > 0)
        .map((r) => ({ source: r.source, xp: r.xp, dailyCap: r.daily_cap }));
    },

    /** Someone's badges, public like the rest of the card. The owner also
     *  gets how far along each one is. */
    async badgesFor(
      username: string,
      viewerId?: string,
    ): Promise<PlayerBadges> {
      const profile = await profiles.findByUsername(username);
      if (!profile) throw AppError.notFound("Profile");
      const [badges, holders, members] = await Promise.all([
        repo.badges(profile.id),
        repo.holders(),
        repo.memberCount(),
      ]);
      const rarity = new Map(
        holders.map((h) => [
          `${h.badge}:${h.metal}`,
          h.holders / Math.max(1, members),
        ]),
      );
      const isOwner = viewerId === profile.id;
      const row = (await repo.profile(profile.id))!;
      const level = levelFor(row.xp).level;
      return {
        level,
        xp: row.xp,
        frame: (row.frame as FrameKey | null) ?? levelFrame(level),
        held: badges.map((b) => ({
          badge: b.badge,
          metal: b.metal as Metal,
          unlockedAt: b.unlocked_at,
          rarity: rarity.get(`${b.badge}:${b.metal}`) ?? 0,
        })),
        // A badge since retired, or no longer held, drops out of the showcase.
        showcase: row.showcase_badges.filter((key) =>
          badges.some((b) => b.badge === key),
        ),
        layout: row.showcase_layout as ShowcaseLayout,
        progress: isOwner
          ? await (async () => {
              const metrics = (await repo.metrics(profile.id)) as Record<
                Metric,
                number
              >;
              const items = await repo.items(profile.id);
              const zone = zoneOf(row);
              const { week } = periodsFor(new Date(), zone);
              metrics.streakBest = (
                await streakFor(row, week, items.streak_shield ?? 0)
              ).best;
              return ALL_BADGES.filter((b) => !b.secret).map((b) => ({
                badge: b.key,
                value: metrics[b.metric] ?? 0,
              }));
            })()
          : undefined,
      };
    },

    /** What the player card shows; null for no such member. Public, like
     *  the card on the profile. */
    async cardSource(username: string): Promise<PlayerCardSource | null> {
      const profile = await profiles.findByUsername(username);
      if (!profile) return null;
      const row = (await repo.profile(profile.id))!;
      const [metrics, badges, items] = await Promise.all([
        repo.metrics(profile.id),
        repo.badges(profile.id),
        repo.items(profile.id),
      ]);
      const level = levelFor(row.xp);
      const best = new Map<string, number>();
      for (const b of badges)
        best.set(b.badge, Math.max(best.get(b.badge) ?? 0, b.metal));
      const owned = {
        level: level.level,
        items,
        gold: new Set([...best].filter(([, m]) => m >= 3).map(([b]) => b)),
      };
      return {
        username: row.username,
        avatarUrl: row.avatar_url,
        level: level.level,
        progress: level.progress,
        xp: row.xp,
        stats: {
          logged: metrics.logged ?? 0,
          finished: metrics.finished ?? 0,
          reviews: metrics.reviews ?? 0,
          hours: metrics.hours ?? 0,
        },
        showcase: row.showcase_badges.flatMap((key) => {
          const def = ALL_BADGES.find((b) => b.key === key);
          const metal = best.get(key);
          return def && metal
            ? [{ name: def.name, metal: metal as Metal }]
            : [];
        }),
        theme: (row.card_theme ?? "default") as CardThemeKey,
        unlocked: CARD_THEME_KEYS.filter((t) => themeUnlocked(t, owned)),
      };
    },

    /** Changes how you look: each choice checked against what you've
     *  earned or bought. */
    async setStyle(userId: string, input: StyleInput) {
      const row = await mustProfile(userId);
      const items = await repo.items(userId);
      const owned = {
        level: levelFor(row.xp).level,
        items,
        gold: await goldBadges(userId),
      };
      const patch: Partial<ProfileRow> = {};
      const locked = (what: string) =>
        AppError.forbidden(`${what} isn't unlocked yet`);

      if (input.frame !== undefined) {
        if (input.frame && !frameUnlocked(input.frame, owned))
          throw locked("That frame");
        patch.frame = input.frame;
      }
      if (input.cardTheme !== undefined) {
        if (!themeUnlocked(input.cardTheme, owned)) throw locked("That theme");
        patch.card_theme =
          input.cardTheme === "default" ? null : input.cardTheme;
      }
      if (input.layout !== undefined) {
        if (input.layout !== "row" && !(items[input.layout] ?? 0)) {
          throw locked("That layout");
        }
        patch.showcase_layout = input.layout;
      }
      if (input.effects !== undefined) {
        if (input.effects.some((e) => !(items[e] ?? 0)))
          throw locked("That effect");
        patch.effects = [...new Set(input.effects)];
      }
      if (input.showcase !== undefined) {
        const showcase = [...new Set(input.showcase)];
        if (showcase.length > showcaseSlots(items)) {
          throw AppError.validation(
            "More badges than your showcase has room for",
          );
        }
        const held = new Set((await repo.badges(userId)).map((b) => b.badge));
        if (showcase.some((b) => !held.has(b))) throw locked("That badge");
        patch.showcase_badges = showcase;
      }
      if (input.pinnedLists !== undefined) {
        const pinned = [...new Set(input.pinnedLists)];
        if (pinned.length > pinnedListSlots(items)) {
          throw AppError.validation(
            "More lists than you have pinned slots for",
          );
        }
        for (const id of pinned) {
          const card = await lists.card(id);
          if (!card || card.user_id !== userId) throw AppError.notFound("List");
        }
        patch.pinned_lists = pinned;
      }
      if (Object.keys(patch).length > 0)
        await repo.updateProfile(userId, patch);
    },

    async shop(userId: string): Promise<Shop> {
      const [row, items, catalogue] = await Promise.all([
        mustProfile(userId),
        repo.items(userId),
        repo.shopItems(),
      ]);
      const prices = new Map(catalogue.map((c) => [c.item, c]));
      return {
        tokens: row.tokens,
        items: SHOP_ITEMS.flatMap((def) => {
          const c = prices.get(def.item);
          if (!c) return [];
          const owned = items[def.item] ?? 0;
          const price =
            c.price + (c.kind === "slot" ? c.price_step * owned : 0);
          return [
            {
              item: def.item,
              kind: def.kind,
              label: def.label,
              price,
              owned,
              maxOwned: c.max_owned,
              affordable: row.tokens >= price && owned < c.max_owned,
            },
          ];
        }),
      };
    },

    async buy(userId: string, item: string) {
      try {
        return await repo.buy(userId, item);
      } catch (error) {
        if (error instanceof BuyError) {
          if (error.reason === "insufficient_tokens") {
            throw new AppError(402, "insufficient_tokens", "Not enough tokens");
          }
          if (error.reason === "max_owned") {
            throw AppError.conflict(
              "conflict",
              "You have as many of those as you can hold",
            );
          }
          throw AppError.notFound("Item");
        }
        throw error;
      }
    },

    /** Swaps one quest for another, with a reroll bought in the shop. One
     *  a period, so a member can't shop for the easiest. */
    async reroll(userId: string, kind: "week" | "month", slot: number) {
      const row = await mustProfile(userId);
      const period = periodsFor(new Date(), zoneOf(row))[kind];
      if (kind === "month" && slot > 2)
        throw AppError.validation("No such quest");
      if (kind === "week" && slot > 2)
        throw AppError.validation("No such quest");
      const done =
        Object.keys(await repo.rerolls(userId, period.key)).length > 0;
      if (done)
        throw AppError.conflict(
          "conflict",
          "You've swapped a task this period already",
        );
      const quest = (await questStates(userId, period))[slot];
      if (quest?.done)
        throw AppError.conflict("conflict", "That task is done already");
      // Bought there and then, if there isn't one held.
      if (!(await repo.useItem(userId, REROLL_ITEM))) {
        await this.buy(userId, REROLL_ITEM);
        await repo.useItem(userId, REROLL_ITEM);
      }
      await repo.addReroll(userId, period.key, slot, randomUUID());
    },

    /** XP this week, this month or all told, among you and your friends. */
    async leaderboard(
      userId: string,
      kind: LeaderboardPeriod,
    ): Promise<LeaderboardRow[]> {
      const row = await mustProfile(userId);
      const ids = [
        userId,
        ...(await friends.listForUser(userId))
          .filter((f) => f.status === "accepted")
          .map((f) => (f.user_a_id === userId ? f.user_b_id : f.user_a_id)),
      ];
      const people = await repo.profilesByIds(ids);
      const xp =
        kind === "all"
          ? new Map(people.map((p) => [p.id, p.xp]))
          : await repo.xpSince(
              ids,
              periodsFor(new Date(), zoneOf(row))[kind].start,
            );
      return people
        .map((p) => ({ p, xp: xp.get(p.id) ?? 0 }))
        .sort((a, b) => b.xp - a.xp || a.p.username.localeCompare(b.p.username))
        .map(({ p, xp }, i) => {
          const level = levelFor(p.xp).level;
          return {
            username: p.username,
            avatarUrl: p.avatar_url,
            accent: toAccent(p.accent),
            level,
            frame: (p.frame as FrameKey | null) ?? levelFrame(level),
            xp,
            rank: i + 1,
            isYou: p.id === userId,
          };
        });
    },

    /**
     * Who invited you. Said once, in your first week, and never by someone
     * you invited yourself: two accounts can't pay each other.
     */
    async refer(userId: string, username: string) {
      const me = await mustProfile(userId);
      if (me.referred_by)
        throw AppError.conflict(
          "conflict",
          "You've said who invited you already",
        );
      if (Date.now() - Date.parse(me.created_at) > REFERRAL_WINDOW_MS) {
        throw AppError.conflict(
          "conflict",
          "Invites count for an account's first week only",
        );
      }
      const referrer = await profiles.findByUsername(username);
      if (!referrer || referrer.id === userId)
        throw AppError.notFound("Profile");
      const theirs = await repo.profile(referrer.id);
      if (theirs?.referred_by === userId) {
        throw AppError.conflict("conflict", "You invited them");
      }
      await repo.updateProfile(userId, { referred_by: referrer.id });
      await repo.awardXp(
        referrer.id,
        "referral_joined",
        `ref:${userId}:joined`,
      );
      await notifications.raise({
        userId: referrer.id,
        kind: "referral_joined",
        actorId: userId,
        data: { username: me.username },
        dedupeKey: `referral:${userId}`,
      });
    },
  };
};

export type ProgressService = ReturnType<typeof createProgressService>;

import {
  BACKGROUND_LEVEL,
  BADGES,
  badgeTokens,
  badgeXp,
  CARD_THEME_KEYS,
  FRAME_KEYS,
  HABIT_WEEKS,
  levelFor,
  levelTokens,
  metalsReached,
  periodsFor,
  NAME_COLOUR_KEYS,
  NAME_FONT_KEYS,
  NO_FRAME,
  questCount,
  questsFor,
  REACTION_KEYS,
  REFERRAL,
  SETUP_REWARD,
  SETUP_STEPS,
  SHOP_ITEMS,
  streakXp,
  swapQuest,
  TASK_TOKENS,
  WEEKLY_SWAPS,
  wornFrame,
  type Backgrounds,
  type GiftFriend,
  type BadgeDef,
  type CardThemeKey,
  type LeaderboardPeriod,
  type LeaderboardRow,
  type Metal,
  type Metric,
  type Period,
  type PlayerBadges,
  type Progress,
  type QuestDef,
  type QuestState,
  type QuestSwap,
  type QuestSwapResult,
  type ReferralInvite,
  type NameColourKey,
  type NameFontKey,
  type SetupStepKey,
  type Shop,
  type StreakWeek,
  type StyleInput,
  type XpRule,
} from "@playrates/shared";
import { AppError } from "../../lib/AppError.js";
import type { ProfileRow } from "../../types/database.types.js";
import type { FriendsRepository } from "../friends/friends.repository.js";
import type { ListsRepository } from "../lists/lists.repository.js";
import { friendRequestKey } from "../notifications/notifications.mapper.js";
import type { NotificationsRepository } from "../notifications/notifications.repository.js";
import type { ProfilesRepository } from "../profiles/profiles.repository.js";
import { toAccent } from "../profiles/profiles.mapper.js";
import {
  colourUnlocked,
  fontUnlocked,
  frameUnlocked,
  localDay,
  pinnedListSlots,
  pinnedReviewSlots,
  reactionUnlocked,
  shiftWeek,
  showcaseSlots,
  streakOf,
  themeUnlocked,
} from "./progress.logic.js";
import type { PlayerCardSource } from "./progress.image.js";
import {
  NUDGE_ACTIVE_DAYS,
  nudgesFor,
  streakNudgeKey,
} from "./progress.nudges.js";
import { BuyError, type ProgressRepository } from "./progress.repository.js";

/** A member from before progress starts with tokens for the levels their
 *  history reached, up to this, so they start rich but not done. */
export const LAUNCH_TOKEN_CAP = 300;
const REFERRAL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** A period's tasks as dealt, and what dealt them. */
interface Deal {
  quests: QuestDef[];
  swaps: QuestSwap[];
  habits: Record<string, number>;
}

const ALL_BADGES = BADGES as readonly BadgeDef[];

const zoneOf = (row: ProfileRow) => row.timezone || "UTC";

/** Where a background comes from: a game the member logged, and only a
 *  picture that game offers. */
export interface BackdropSource {
  backdrops(gameId: number): Promise<{ url: string }[]>;
  hasLogged(userId: string, gameId: number): Promise<boolean>;
}

/** How a member's name is set, from what they stored. */
export const nameStyleOf = (row: ProfileRow) => ({
  nameFont: (row.name_font as NameFontKey | null) ?? "default",
  nameColour: (row.name_colour as NameColourKey | null) ?? "default",
});

export const createProgressService = (
  repo: ProgressRepository,
  profiles: ProfilesRepository,
  friends: FriendsRepository,
  lists: ListsRepository,
  notifications: NotificationsRepository,
  backdrops: BackdropSource,
  /** Who wrote a review, for pinning only your own. */
  reviewAuthor: (reviewId: number) => Promise<string | null>,
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
      frameChoice: row.frame,
      cardTheme: (row.card_theme as CardThemeKey | null) ?? "default",
      ...nameStyleOf(row),
      frames: FRAME_KEYS.filter((f) => frameUnlocked(f, owned)),
      themes: CARD_THEME_KEYS.filter((t) => themeUnlocked(t, owned)),
      fonts: NAME_FONT_KEYS.filter((f) => fontUnlocked(f, owned)),
      colours: NAME_COLOUR_KEYS.filter((c) => colourUnlocked(c, owned)),
      reactions: REACTION_KEYS.filter((r) => reactionUnlocked(r, owned)),
      showcaseSlots: showcaseSlots(items),
      pinnedListSlots: pinnedListSlots(items),
      pinnedReviewSlots: pinnedReviewSlots(items),
    };
  };

  /** This period's tasks: dealt from what the member did in the weeks
   *  before it, which can't change during it, then any swap. */
  const dealOf = async (userId: string, period: Period): Promise<Deal> => {
    const habitsFrom = new Date(
      Date.parse(period.start) - HABIT_WEEKS * 7 * DAY_MS,
    ).toISOString();
    const [habits, swaps] = await Promise.all([
      repo.countSources(userId, habitsFrom, period.start),
      period.kind === "week" ? repo.swaps(userId, period.key) : [],
    ]);
    return {
      quests: questsFor(userId, period, { habits, swaps }),
      swaps,
      habits,
    };
  };

  /** The dealt tasks, counted from the ledger. */
  const questStates = async (
    userId: string,
    period: Period,
    deal: Deal,
  ): Promise<QuestState[]> => {
    const counts = await repo.countSources(userId, period.start, period.end);
    return deal.quests.map((q, slot) => {
      const count = questCount(q, counts);
      return {
        slot,
        key: q.key,
        label: q.label,
        target: q.target,
        count,
        xp: q.xp,
        tokens: TASK_TOKENS[period.kind],
        done: count >= q.target,
        swapped: deal.swaps.some((s) => s.slot === slot),
      };
    });
  };

  const swapsLeft = (deal: Deal) =>
    Math.max(0, WEEKLY_SWAPS - deal.swaps.length);

  /** The last 26 weeks, oldest first, for the streak's graph. */
  const historyOf = (
    weeks: string[],
    current: string,
    shielded: string[],
  ): StreakWeek[] => {
    const active = new Set(weeks);
    const covered = new Set(shielded);
    return Array.from({ length: 26 }, (_, i) => {
      const w = shiftWeek(current, i - 25);
      return {
        week: w,
        state: active.has(w) ? "active" : covered.has(w) ? "shield" : "empty",
      };
    });
  };

  /** Getting started, from what the account holds. Any game on any shelf
   *  is a first log, as the step says. */
  const setupOf = (
    row: ProfileRow,
    metrics: Record<string, number>,
    favourites: number,
  ): Record<SetupStepKey, boolean> => ({
    picture: !!row.avatar_url,
    bio: (row.bio ?? "").trim().length > 0,
    log: (metrics.shelved ?? 0) > 0,
    rate: (metrics.rated ?? 0) > 0,
    review: (metrics.reviews ?? 0) > 0,
    favourites: favourites > 0,
    friend: (metrics.friends ?? 0) > 0,
    post: (metrics.posts ?? 0) > 0,
  });

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
      /* XP too: nearly every visit finds each award made on an earlier
         one, so they're checked in one read rather than a call each. Every
         call here is a round trip to the database. */
      const awards: {
        source: string;
        key: string;
        xp: number;
        data?: Record<string, unknown>;
      }[] = [];

      const [
        weeks,
        shieldsUsed,
        firstItems,
        dealWeek,
        dealMonth,
        counted,
        held,
        favourites,
      ] = await Promise.all([
        repo.weeks(userId),
        repo.shieldsUsed(userId),
        repo.items(userId),
        dealOf(userId, periods.week),
        dealOf(userId, periods.month),
        repo.metrics(userId),
        repo.badges(userId),
        repo.favouriteCount(userId),
      ]);

      // The streak, spending a bought shield if it would end otherwise.
      const current = localDay(periods.week.start, zone);
      let items = firstItems;
      let streak = streakOf({
        weeks,
        used: shieldsUsed,
        current,
        spare: items.streak_shield ?? 0,
      });
      if (streak.spend && (await repo.useItem(userId, "streak_shield"))) {
        await repo.recordShield(userId, streak.spend);
        const [after, used] = await Promise.all([
          repo.items(userId),
          repo.shieldsUsed(userId),
        ]);
        items = after;
        streak = streakOf({
          weeks,
          used,
          current,
          spare: items.streak_shield ?? 0,
        });
      }
      const streakKey = `streak:${periods.week.key}`;
      if (streak.thisWeek && streak.weeks > 0) {
        awards.push({
          source: "streak",
          key: streakKey,
          xp: streakXp(streak.weeks),
        });
      }

      // Tasks, each with its XP and tokens. They count what the member did,
      // not anything awarded here, so they're read once.
      const deals = { week: dealWeek, month: dealMonth };
      const [week, month] = await Promise.all([
        questStates(userId, periods.week, deals.week),
        questStates(userId, periods.month, deals.month),
      ]);
      for (const [period, quests] of [
        [periods.week, week],
        [periods.month, month],
      ] as const) {
        for (const q of quests.filter((q) => q.done)) {
          awards.push({
            source: "quest",
            key: `quest:${period.key}:${q.key}`,
            xp: q.xp,
          });
          grant("task", `task:${period.key}:${q.key}`, q.tokens);
        }
      }

      // Badges, from counts the database keeps and the streak's best.
      const metrics = counted as Record<Metric, number>;
      metrics.streakBest = streak.best;
      const heldKeys = new Set(held.map((b) => `${b.badge}:${b.metal}`));
      let unlocked = false;
      for (const badge of ALL_BADGES) {
        for (const metal of metalsReached(badge, metrics[badge.metric] ?? 0)) {
          if (heldKeys.has(`${badge.key}:${metal}`)) continue;
          await repo.unlockBadge(userId, badge.key, metal);
          unlocked = true;
          const xp = badgeXp(badge, metal);
          if (xp > 0) {
            awards.push({
              source: "badge",
              key: `badge:${badge.key}:${metal}`,
              xp,
              // History's badges: the leaderboard leaves these out.
              data: launch ? { launch: true } : undefined,
            });
          }
          grant(
            "badge",
            `badge:${badge.key}:${metal}`,
            badgeTokens(badge, metal),
          );
        }
      }

      // An invited friend who got going pays both ends, once, and the one
      // who invited them hears about it. The token row is the marker.
      if (row.referred_by && (metrics.logged ?? 0) >= REFERRAL.activeAfter) {
        const referrer = row.referred_by;
        const paid = (await repo.tokenKeys(referrer, `ref:${userId}`)).size > 0;
        if (!paid) {
          await repo.awardXp(
            referrer,
            "referral_active",
            `ref:${userId}:active`,
            REFERRAL.activeXp,
          );
          await repo.awardTokens(
            referrer,
            "referral",
            `ref:${userId}`,
            REFERRAL.activeTokens,
          );
          awards.push({
            source: "referral_welcome",
            key: "ref:welcome",
            xp: REFERRAL.welcomeXp,
          });
          grant("referral", "ref:welcome", REFERRAL.welcomeTokens);
          await notifications.raise({
            userId: referrer,
            kind: "referral_active",
            actorId: userId,
            data: {
              username: row.username,
              xp: REFERRAL.activeXp,
              tokens: REFERRAL.activeTokens,
            },
            dedupeKey: `referral_active:${userId}`,
          });
        }
      }

      // Getting started, all of it, pays once.
      const setup = setupOf(row, metrics, favourites);
      if (SETUP_STEPS.every((step) => setup[step])) {
        awards.push({ source: "setup", key: "setup", xp: SETUP_REWARD.xp });
        grant("setup", "setup", SETUP_REWARD.tokens);
      }

      /* Only what's new, or more than was paid before: award_xp leaves an
         award alone otherwise, so calling it would change nothing. */
      const before = await repo.xpAwarded(
        userId,
        awards.map((a) => a.key),
      );
      const newAwards = awards.filter((a) => (before.get(a.key) ?? -1) < a.xp);
      for (const a of newAwards) {
        await repo.awardXp(userId, a.source, a.key, a.xp, a.data);
      }
      if (newAwards.some((a) => a.key === streakKey)) {
        // Kept: the nudge about losing it has nothing left to say.
        await notifications.markReadByKey(
          userId,
          streakNudgeKey(periods.week),
        );
      }

      // Levels, after everything above has landed.
      if (newAwards.length > 0) row = await mustProfile(userId);
      const level = levelFor(row.xp);
      for (let n = 2; n <= level.level; n++) {
        grant("level", `level:${n}`, levelTokens(n));
      }

      /* Only what isn't in the ledger yet: a task done earlier in the week
         is gathered again on every visit, and counting it each time said
         its tokens were new each time. Backgrounds open at their level,
         the first picture free. */
      const [paidKeys, credited] = await Promise.all([
        repo.paidTokenKeys(
          userId,
          grants.map((g) => g.key),
        ),
        level.level >= BACKGROUND_LEVEL
          ? repo.grantBackgroundCredit(userId)
          : false,
      ]);
      if (credited) items = await repo.items(userId);
      const fresh = grants.filter((g) => !paidKeys.has(g.key));
      let gained = 0;
      const launchPaid =
        launch && (await repo.tokenKeys(userId, "launch")).size > 0;
      if (launch && !launchPaid) {
        // The history, as one capped sum, each source keyed at 0 so it
        // isn't paid again.
        for (const g of fresh)
          await repo.awardTokens(userId, g.source, g.key, 0);
        gained = Math.min(
          LAUNCH_TOKEN_CAP,
          fresh.reduce((n, g) => n + g.amount, 0),
        );
        if (gained > 0) {
          await repo.awardTokens(userId, "launch", "launch", gained);
        }
      } else {
        /* Earned since: a member counted by the deploy's backfill who comes
           back weeks later is paid for those weeks as anyone else is. */
        for (const g of fresh) {
          await repo.awardTokens(userId, g.source, g.key, g.amount);
          gained += g.amount;
        }
      }

      if (gained > 0) row = await mustProfile(userId);
      const [unseenXp, badges] = await Promise.all([
        launch
          ? Promise.resolve([])
          : repo.unseenXp(userId, row.xp_seen_event_id),
        unlocked ? repo.badges(userId) : held,
      ]);

      return {
        xp: row.xp,
        level: levelFor(row.xp),
        tokens: row.tokens,
        frame: wornFrame(row.frame, levelFor(row.xp).level),
        streak: {
          weeks: streak.weeks,
          best: streak.best,
          thisWeek: streak.thisWeek,
          freeShield: streak.freeShield,
          spareShields: items.streak_shield ?? 0,
          history: historyOf(weeks, current, streak.shielded),
        },
        quests: { week, month, swapsLeft: swapsLeft(deals.week) },
        periods,
        look: lookOf(row, items, badges),
        setup: { steps: setup, reward: SETUP_REWARD },
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

    /**
     * Trades one undone weekly task for another, once a week: never one in
     * the set already, and one not done already if there is such a task.
     */
    async swapQuest(
      userId: string,
      slot: number,
      now = new Date(),
    ): Promise<QuestSwapResult> {
      const row = await mustProfile(userId);
      const { week } = periodsFor(now, zoneOf(row));
      const deal = await dealOf(userId, week);
      const used = () =>
        AppError.conflict(
          "conflict",
          "You've swapped a task this week already",
        );
      if (swapsLeft(deal) === 0) throw used();
      const current = deal.quests[slot];
      if (!current) throw AppError.notFound("Task");
      const counts = await repo.countSources(userId, week.start, week.end);
      if (questCount(current, counts) >= current.target) {
        throw AppError.conflict("conflict", "That task is done already");
      }
      const next = swapQuest(userId, week, deal.quests, slot, {
        habits: deal.habits,
        counts,
      });
      if (!next)
        throw AppError.conflict("conflict", "There's no task to swap in");
      if (!(await repo.recordSwap(userId, week.key, slot, next.key)))
        throw used();
      const after = await dealOf(userId, week);
      return {
        week: await questStates(userId, week, after),
        swapsLeft: swapsLeft(after),
      };
    },

    /**
     * Raises the day's nudges for everyone seen lately: a streak about to go
     * and a task nearly done near its period's end. Read in one statement,
     * decided here with the same rules the progress page uses, and written
     * in one; each is keyed to its period, so running twice raises nothing
     * more.
     */
    async nudge(
      now = new Date(),
    ): Promise<{ members: number; raised: number }> {
      const since = new Date(now.getTime() - NUDGE_ACTIVE_DAYS * DAY_MS);
      const members = await repo.nudgeCandidates(
        since.toISOString(),
        now.toISOString(),
      );
      const drafts = members.flatMap((m) => nudgesFor(m, now));
      return {
        members: members.length,
        raised: await notifications.raiseOnce(drafts),
      };
    },

    /** Who an invite link is from, for the page it opens: the card only,
     *  which anyone may see, private profiles included. */
    async invite(username: string): Promise<ReferralInvite> {
      const profile = await profiles.findByUsername(username);
      if (!profile) throw AppError.notFound("Profile");
      const row = await mustProfile(profile.id);
      const level = levelFor(row.xp).level;
      return {
        username: row.username,
        avatarUrl: row.avatar_url,
        accent: toAccent(row.accent),
        level,
        frame: wornFrame(row.frame, level),
        reward: {
          xp: REFERRAL.welcomeXp,
          tokens: REFERRAL.welcomeTokens,
          afterGames: REFERRAL.activeAfter,
        },
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
      const items = await repo.items(profile.id);
      const level = levelFor(row.xp).level;
      return {
        level,
        xp: row.xp,
        frame: wornFrame(row.frame, level),
        held: badges.map((b) => ({
          badge: b.badge,
          metal: b.metal as Metal,
          unlockedAt: b.unlocked_at,
          rarity: rarity.get(`${b.badge}:${b.metal}`) ?? 0,
        })),
        // A badge since retired, or no longer held, drops out of the
        // showcase, as does one past the slots it has now.
        showcase: row.showcase_badges
          .filter((key) => badges.some((b) => b.badge === key))
          .slice(0, showcaseSlots(items)),
        progress: isOwner
          ? await (async () => {
              const metrics = (await repo.metrics(profile.id)) as Record<
                Metric,
                number
              >;
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
        if (
          input.frame &&
          input.frame !== NO_FRAME &&
          !frameUnlocked(input.frame, owned)
        )
          throw locked("That frame");
        patch.frame = input.frame;
      }
      if (input.cardTheme !== undefined) {
        if (!themeUnlocked(input.cardTheme, owned)) throw locked("That theme");
        patch.card_theme =
          input.cardTheme === "default" ? null : input.cardTheme;
      }
      if (input.nameFont !== undefined) {
        if (!fontUnlocked(input.nameFont, owned)) throw locked("That font");
        patch.name_font = input.nameFont === "default" ? null : input.nameFont;
      }
      if (input.nameColour !== undefined) {
        if (!colourUnlocked(input.nameColour, owned))
          throw locked("That colour");
        patch.name_colour =
          input.nameColour === "default" ? null : input.nameColour;
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
      if (input.pinnedReviews !== undefined) {
        const pinned = [...new Set(input.pinnedReviews)];
        if (pinned.length > pinnedReviewSlots(items)) {
          throw AppError.validation(
            "More reviews than you have pinned slots for",
          );
        }
        for (const id of pinned) {
          if ((await reviewAuthor(id)) !== userId)
            throw AppError.notFound("Review");
        }
        patch.pinned_reviews = pinned;
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
              group: def.group,
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

    /** The reactions a member may leave: the upvote, and what their level
     *  and packs open. Read by every service that takes a reaction. */
    async reactionsFor(userId: string): Promise<Set<string>> {
      const [row, items] = await Promise.all([
        mustProfile(userId),
        repo.items(userId),
      ]);
      const owned = {
        level: levelFor(row.xp).level,
        items,
        gold: new Set<string>(),
      };
      return new Set(REACTION_KEYS.filter((r) => reactionUnlocked(r, owned)));
    },

    /** Your friends, as someone to give an item to: one who can't hold
     *  another is marked full. */
    async giftFriends(userId: string, item: string): Promise<GiftFriend[]> {
      const ids = (await friends.listForUser(userId))
        .filter((f) => f.status === "accepted")
        .map((f) => (f.user_a_id === userId ? f.user_b_id : f.user_a_id));
      const [people, held, catalogue] = await Promise.all([
        repo.profilesByIds(ids),
        repo.holdings(ids, item),
        repo.shopItems(),
      ]);
      const c = catalogue.find((c) => c.item === item);
      if (!c) throw AppError.notFound("Item");
      return people
        .map((p) => {
          const have = held.get(p.id) ?? 0;
          return {
            username: p.username,
            avatarUrl: p.avatar_url,
            accent: toAccent(p.accent),
            full: have >= c.max_owned,
            price: c.price + (c.kind === "slot" ? c.price_step * have : 0),
          };
        })
        .sort((a, b) => a.username.localeCompare(b.username));
    },

    /** Buys an item for a friend, with your tokens, and tells them. */
    async gift(userId: string, item: string, username: string) {
      const recipient = await profiles.findByUsername(username);
      if (!recipient || recipient.id === userId)
        throw AppError.notFound("Profile");
      const edge = (await friends.listForUser(userId)).find(
        (f) =>
          f.status === "accepted" &&
          (f.user_a_id === recipient.id || f.user_b_id === recipient.id),
      );
      if (!edge) throw AppError.forbidden("You can only send gifts to friends");
      const giver = await mustProfile(userId);
      let result: { tokens: number; cost: number };
      try {
        result = await repo.gift(userId, recipient.id, item);
      } catch (error) {
        if (error instanceof BuyError) {
          if (error.reason === "insufficient_tokens")
            throw new AppError(402, "insufficient_tokens", "Not enough tokens");
          if (error.reason === "max_owned")
            throw AppError.conflict("conflict", "They have that already");
          throw AppError.notFound("Item");
        }
        throw error;
      }
      await notifications.raise({
        userId: recipient.id,
        kind: "gift_received",
        actorId: userId,
        data: { username: giver.username, item },
        dedupeKey: `gift:${userId}:${item}:${Date.now()}`,
      });
      return result;
    },

    /** The pictures you own, by game, and whether you can buy more. */
    async backgrounds(userId: string): Promise<Backgrounds> {
      const [row, items, owned] = await Promise.all([
        mustProfile(userId),
        repo.items(userId),
        repo.ownedBackgrounds(userId),
      ]);
      const games = new Map<number, Backgrounds["games"][number]>();
      for (const b of owned) {
        const game = games.get(b.game_id) ?? {
          gameId: b.game_id,
          title: b.title,
          coverUrl: b.cover_url,
          urls: [],
        };
        game.urls.push(b.url);
        games.set(b.game_id, game);
      }
      return {
        unlocked: levelFor(row.xp).level >= BACKGROUND_LEVEL,
        credits: items.background_credit ?? 0,
        tokens: row.tokens,
        games: [...games.values()],
      };
    },

    /** One picture from a game you've logged, with your free one first. */
    async buyBackground(userId: string, gameId: number, url: string) {
      const row = await mustProfile(userId);
      if (levelFor(row.xp).level < BACKGROUND_LEVEL) {
        throw AppError.forbidden(
          `Backgrounds open at level ${BACKGROUND_LEVEL}`,
        );
      }
      if (!(await backdrops.hasLogged(userId, gameId))) {
        throw AppError.forbidden(
          "You can only use pictures from games you've logged",
        );
      }
      const offered = await backdrops.backdrops(gameId);
      if (!offered.some((b) => b.url === url)) {
        throw AppError.validation("That picture isn't one of this game's");
      }
      try {
        return await repo.buyBackground(userId, gameId, url);
      } catch (error) {
        if (error instanceof BuyError) {
          if (error.reason === "owned")
            throw AppError.conflict(
              "conflict",
              "That picture is yours already",
            );
          throw new AppError(402, "insufficient_tokens", "Not enough tokens");
        }
        throw error;
      }
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
            frame: wornFrame(p.frame, level),
            ...nameStyleOf(p),
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
        REFERRAL.joinedXp,
      );
      await notifications.raise({
        userId: referrer.id,
        kind: "referral_joined",
        actorId: userId,
        data: { username: me.username },
        dedupeKey: `referral:${userId}`,
      });
      /* The two know each other, so the one who invited asks: the new
         member gets a request to accept, not one to remember to send. */
      if (!(await friends.find(referrer.id, userId))) {
        try {
          await friends.create(referrer.id, userId);
        } catch (error) {
          // A request sent between the check and here is the same request.
          if ((error as { code?: string }).code === "23505") return;
          throw error;
        }
        await notifications.raise({
          userId,
          kind: "friend_request",
          actorId: referrer.id,
          dedupeKey: friendRequestKey(referrer.id),
        });
      }
    },
  };
};

export type ProgressService = ReturnType<typeof createProgressService>;

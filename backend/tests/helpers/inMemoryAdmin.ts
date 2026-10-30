import { ACTIVITY_GROUPS, GAME_EVENT_GROUPS } from "@playrates/shared";
import type { AdminRepository } from "../../src/modules/admin/admin.repository.js";
import { announcementKey } from "../../src/modules/admin/admin.repository.js";
import type { GameEventsRepository } from "../../src/modules/games/gameEvents.repository.js";
import type {
  AdminActivityFeedRow,
  AdminGameFeedRow,
  AdminUserDirectoryRow,
  AnnouncementCardRow,
} from "../../src/types/database.types.js";
import type { InMemoryState } from "./inMemoryRepos.js";

/**
 * The admin read models over plain arrays. The SQL aggregates (admin_series,
 * admin_metric_detail) are not reimplemented: they are exercised against
 * Postgres, and the route tests here are about the gate, validation and what
 * the service does with what it reads.
 */
export const createInMemoryGameEvents = (
  state: InMemoryState,
): GameEventsRepository => {
  let nextId = 8000;
  return {
    async record(events) {
      for (const event of Array.isArray(events) ? events : [events]) {
        state.gameEvents.push({
          id: nextId++,
          kind: event.kind,
          source: event.source,
          game_id: event.gameId ?? null,
          actor_id: event.actorId ?? null,
          data: event.data ?? {},
          created_at: new Date().toISOString(),
        });
      }
    },
  };
};

export const createInMemoryAdmin = (state: InMemoryState): AdminRepository => {
  let nextAnnouncementId = 9000;
  const settings = new Map<string, unknown>();
  let nextNotificationId = 9500;

  const directoryRow = (id: string): AdminUserDirectoryRow | null => {
    const p = state.profiles.find((x) => x.id === id);
    if (!p) return null;
    return {
      id: p.id,
      username: p.username,
      avatar_url: p.avatar_url,
      accent: p.accent,
      is_admin: p.is_admin,
      created_at: p.created_at,
      last_seen_at: p.last_seen_at,
      onboarded_at: p.onboarded_at,
      log_count: state.gameLogs.filter((l) => l.user_id === id).length,
      review_count: state.reviews.filter((r) => r.user_id === id).length,
      message_count: state.communityMessages.filter(
        (m) => m.author_id === id && !m.deleted_at,
      ).length,
      friend_count: state.friendships.filter(
        (f) => f.status === "accepted" && (f.user_a_id === id || f.user_b_id === id),
      ).length,
      active_day_count: 0,
    };
  };

  const card = (id: number): AnnouncementCardRow | null => {
    const a = state.announcements.find((x) => x.id === id);
    if (!a) return null;
    return {
      ...a,
      read_count: state.notifications.filter(
        (n) => n.dedupe_key === announcementKey(id) && n.read_at !== null,
      ).length,
    };
  };

  const page = <T extends { id: number }>(
    rows: T[],
    before: number | undefined,
    limit: number,
  ): T[] =>
    [...rows]
      .sort((a, b) => b.id - a.id)
      .filter((r) => before === undefined || r.id < before)
      .slice(0, limit + 1);

  return {
    async ping() {},

    // As admin_progress counts it, over the same state.
    async progress() {
      const since = (days: number) => Date.now() - days * 86_400_000;
      const bySource = new Map<string, { xp: number; events: number }>();
      for (const e of state.xpEvents.filter(
        (e) => Date.parse(e.created_at) > since(30),
      )) {
        const was = bySource.get(e.source) ?? { xp: 0, events: 0 };
        bySource.set(e.source, { xp: was.xp + e.xp, events: was.events + 1 });
      }
      const shop = new Map<string, { sold: number; tokens: number }>();
      for (const e of state.tokenEvents.filter(
        (e) => (e.source === "purchase" || e.source === "gift") && e.amount < 0,
      )) {
        const item = e.key.startsWith("background:")
          ? "background"
          : (e.key.split(":")[1] ?? "");
        const was = shop.get(item) ?? { sold: 0, tokens: 0 };
        shop.set(item, { sold: was.sold + 1, tokens: was.tokens - e.amount });
      }
      const xpOf = (id: string) =>
        state.xpEvents
          .filter((e) => e.user_id === id)
          .reduce((sum, e) => sum + e.xp, 0);
      const tokens = state.tokenEvents;
      const reactions = new Map<string, number>();
      for (const v of [
        ...state.reviewVotes,
        ...state.communityVotes,
        ...state.gameListVotes,
      ]) {
        const r = v.reaction ?? "upvote";
        reactions.set(r, (reactions.get(r) ?? 0) + 1);
      }
      const badges = new Map<string, number>();
      for (const b of state.userBadges) {
        const key = `${b.badge}:${b.metal}`;
        badges.set(key, (badges.get(key) ?? 0) + 1);
      }
      return {
        members: state.profiles.length,
        xps: state.profiles.map((p) => xpOf(p.id)),
        xp_last_week: state.xpEvents
          .filter((e) => Date.parse(e.created_at) > since(7))
          .reduce((sum, e) => sum + e.xp, 0),
        tokens_held: tokens.reduce((sum, e) => sum + e.amount, 0),
        tokens_earned: tokens
          .filter((e) => e.amount > 0)
          .reduce((sum, e) => sum + e.amount, 0),
        tokens_spent: -tokens
          .filter((e) => e.source === "purchase")
          .reduce((sum, e) => sum + e.amount, 0),
        tokens_gifted: -tokens
          .filter((e) => e.source === "gift")
          .reduce((sum, e) => sum + e.amount, 0),
        top: [...state.profiles]
          .sort((a, b) => xpOf(b.id) - xpOf(a.id))
          .slice(0, 10)
          .map((p) => ({
            username: p.username,
            avatar_url: p.avatar_url,
            accent: p.accent,
            xp: xpOf(p.id),
          })),
        xp_by_source: [...bySource].map(([source, v]) => ({ source, ...v })),
        badges: [...badges].map(([key, holders]) => {
          const [badge, metal] = key.split(":");
          return { badge: badge!, metal: Number(metal), holders };
        }),
        shop: [...shop].map(([item, v]) => ({ item, ...v })),
        reactions: [...reactions].map(([reaction, count]) => ({
          reaction,
          count,
        })),
        tasks_week: 0,
        tasks_month: 0,
        referrals_joined: state.profiles.filter((p) => p.referred_by).length,
        referrals_active: state.xpEvents.filter(
          (e) => e.source === "referral_active",
        ).length,
        setup_done: state.xpEvents.filter((e) => e.key === "setup").length,
        reveal_waiting: state.profiles.filter((p) => p.revealed_at === null)
          .length,
      };
    },

    async totals() {
      return {
        users: state.profiles.length,
        onboarded: state.profiles.filter((p) => p.onboarded_at).length,
        logs: state.gameLogs.length,
        reviews: state.reviews.length,
        threads: state.communityThreads.length,
        messages: state.communityMessages.filter((m) => !m.deleted_at).length,
        games: state.games.length,
        friendships: state.friendships.filter((f) => f.status === "accepted").length,
        online: 0,
        dau: 0,
        wau: 0,
        mau: 0,
      };
    },

    async series() {
      return [];
    },

    async metricDetail() {
      return {};
    },

    async activity({ before, limit, group, kind, userId, gameId, since }) {
      const rows: AdminActivityFeedRow[] = state.activityEvents
        .filter((e) => !group || (ACTIVITY_GROUPS[group] as readonly string[]).includes(e.kind))
        .filter((e) => !kind || e.kind === kind)
        .filter((e) => !userId || e.actor_id === userId)
        .filter((e) => !gameId || e.game_id === gameId)
        .filter((e) => !since || e.created_at >= since)
        .map((e) => {
          const actor = state.profiles.find((p) => p.id === e.actor_id);
          const game = state.games.find((g) => g.id === e.game_id);
          return {
            ...e,
            actor_username: actor?.username ?? null,
            actor_avatar_url: actor?.avatar_url ?? null,
            actor_accent: actor?.accent ?? null,
            game_title: game?.title ?? null,
            game_cover_url: game?.cover_url ?? null,
            subject_username: null,
            message_excerpt: null,
          };
        });
      return page(rows, before, limit);
    },

    async activityCounts({ userId, gameId, since }) {
      const counts: Record<string, number> = {};
      for (const e of state.activityEvents) {
        if (userId && e.actor_id !== userId) continue;
        if (gameId && e.game_id !== gameId) continue;
        if (since && e.created_at < since) continue;
        counts[e.kind] = (counts[e.kind] ?? 0) + 1;
      }
      return counts;
    },

    async gameEvents({ before, limit, group, gameId }) {
      const rows: AdminGameFeedRow[] = state.gameEvents
        .filter((e) => !group || (GAME_EVENT_GROUPS[group] as readonly string[]).includes(e.kind))
        .filter((e) => !gameId || e.game_id === gameId)
        .map((e) => {
          const game = state.games.find((g) => g.id === e.game_id);
          return {
            ...e,
            game_title: game?.title ?? null,
            game_slug: game?.slug ?? null,
            game_cover_url: game?.cover_url ?? null,
            game_is_trending: game?.is_trending ?? null,
            game_igdb_id: game?.igdb_id ?? null,
            actor_username:
              state.profiles.find((p) => p.id === e.actor_id)?.username ?? null,
          };
        });
      return page(rows, before, limit);
    },

    async users(query, from, to) {
      const all = state.profiles
        .filter(
          (p) =>
            !query.q || p.username.toLowerCase().includes(query.q.toLowerCase()),
        )
        .map((p) => directoryRow(p.id)!);
      return { rows: all.slice(from, to + 1), total: all.length };
    },

    async userById(id) {
      return directoryRow(id);
    },

    async igdbUsage(from) {
      return state.igdbUsage.filter((d) => d.day >= from);
    },

    async userActiveDays() {
      return [];
    },

    async getSetting<T>(key: string) {
      return (settings.get(key) as T | undefined) ?? null;
    },

    async setSetting(key, value) {
      settings.set(key, value);
    },

    async serverErrors(before, limit) {
      return page(state.serverErrors, before, limit).map((row) => ({
        ...row,
        username:
          state.profiles.find((p) => p.id === row.user_id)?.username ?? null,
      }));
    },

    async serverErrorStats(since) {
      const recent = state.serverErrors.filter((e) => e.created_at >= since);
      return {
        count: recent.length,
        lastAt: state.serverErrors.at(-1)?.created_at ?? null,
      };
    },

    async listAnnouncements() {
      return state.announcements.map((a) => card(a.id)!).reverse();
    },

    async findAnnouncement(id) {
      return card(id);
    },

    async createAnnouncement(input, sentBy, patchNoteMessageId) {
      const row = {
        id: nextAnnouncementId++,
        tone: input.tone,
        title: input.title,
        body: input.body,
        link_path: input.link,
        sent_by: sentBy,
        recipient_count: 0,
        created_at: new Date().toISOString(),
        retracted_at: null,
        patch_note_message_id: patchNoteMessageId ?? null,
        email_broadcast_id: null,
        emailed_at: null,
      };
      state.announcements.push(row);
      return row;
    },

    async markAnnouncementEmailed(id, broadcastId) {
      const a = state.announcements.find((x) => x.id === id);
      if (!a) return;
      a.email_broadcast_id = broadcastId;
      a.emailed_at = new Date().toISOString();
    },

    // what broadcast_announcement does: a copy per profile, once
    async broadcastAnnouncement(id) {
      const a = state.announcements.find((x) => x.id === id);
      if (!a || a.retracted_at) return 0;
      let sent = 0;
      for (const p of state.profiles) {
        const key = announcementKey(id);
        if (state.notifications.some((n) => n.user_id === p.id && n.dedupe_key === key)) {
          continue;
        }
        state.notifications.push({
          id: nextNotificationId++,
          user_id: p.id,
          kind: "announcement",
          actor_id: null,
          data: {
            announcementId: a.id,
            tone: a.tone,
            title: a.title,
            body: a.body,
            link: a.link_path,
          },
          dedupe_key: key,
          read_at: null,
          archived_at: null,
          created_at: new Date().toISOString(),
        });
        sent++;
      }
      a.recipient_count += sent;
      return sent;
    },

    async retractAnnouncement(id) {
      state.notifications = state.notifications.filter(
        (n) => !(n.kind === "announcement" && n.dedupe_key === announcementKey(id)),
      );
      const a = state.announcements.find((x) => x.id === id);
      if (a) a.retracted_at = new Date().toISOString();
    },

    async listPatchNoteEntries() {
      const notes = state.communityThreads.find((t) => t.subject_kind === "patch_notes");
      return state.communityMessages
        .filter((m) => m.thread_id === notes?.id && m.parent_id === null && !m.deleted_at)
        .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)
        .map(({ id, thread_id, body, created_at, edited_at }) => ({
          id,
          thread_id,
          body,
          created_at,
          edited_at,
        }));
    },

    async findPatchNoteEntry(messageId) {
      const notes = state.communityThreads.find((t) => t.subject_kind === "patch_notes");
      const m = state.communityMessages.find(
        (x) => x.id === messageId && x.thread_id === notes?.id && x.parent_id === null && !x.deleted_at,
      );
      return m
        ? { id: m.id, thread_id: m.thread_id, body: m.body, created_at: m.created_at, edited_at: m.edited_at }
        : null;
    },

    async standingPatchNoteAnnouncements() {
      return state.announcements
        .filter((a) => a.patch_note_message_id !== null && !a.retracted_at)
        .map((a) => card(a.id)!);
    },
  };
};

import type {
  EventRow,
  EventsRepository,
} from "../../src/modules/events/events.repository.js";
import type {
  AwardCategoryRow,
  AwardNomineeRow,
  AwardsRepository,
} from "../../src/modules/events/awards/awards.repository.js";
import type {
  RevealRow,
  ShowcaseRepository,
} from "../../src/modules/events/showcase/showcase.repository.js";
import type { InMemoryState } from "./inMemoryRepos.js";

export interface AwardPickState {
  user_id: string;
  category_id: number;
  nominee_id: number;
}

export interface EventBadgeState {
  user_id: string;
  event_id: number;
  badge: string;
  earned_at?: string;
}

/** A unique or foreign key refusing, as Postgres says it. */
const pgError = (code: string) => Object.assign(new Error(code), { code });

let nextId = 1000;

export const createInMemoryEvents = (
  state: InMemoryState,
): EventsRepository => ({
  async list(publishedOnly) {
    return state.events
      .filter((e) => !publishedOnly || e.published_at !== null)
      .sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at));
  },
  async findBySlug(slug) {
    return state.events.find((e) => e.slug === slug) ?? null;
  },
  async findById(id) {
    return state.events.find((e) => e.id === id) ?? null;
  },
  async findByIds(ids) {
    return state.events.filter((e) => ids.includes(e.id));
  },
  async insert(event) {
    if (state.events.some((e) => e.slug === event.slug)) {
      throw pgError("23505");
    }
    const row: EventRow = {
      id: nextId++,
      published_at: null,
      created_at: "2026-11-01T00:00:00.000Z",
      updated_at: "2026-11-01T00:00:00.000Z",
      ...event,
    };
    state.events.push(row);
    return row;
  },
  async update(id, patch) {
    const row = state.events.find((e) => e.id === id);
    if (!row) return null;
    Object.assign(row, patch);
    return row;
  },
  async badgesOf(userId, eventId) {
    return state.eventBadges
      .filter((b) => b.user_id === userId && b.event_id === eventId)
      .map((b) => b.badge);
  },
  async grantBadge(userId, eventId, badge) {
    if (
      !state.eventBadges.some(
        (b) =>
          b.user_id === userId && b.event_id === eventId && b.badge === badge,
      )
    ) {
      state.eventBadges.push({
        user_id: userId,
        event_id: eventId,
        badge,
        earned_at: new Date().toISOString(),
      });
    }
  },
  async revokeBadge(userId, eventId, badge) {
    state.eventBadges = state.eventBadges.filter(
      (b) =>
        !(b.user_id === userId && b.event_id === eventId && b.badge === badge),
    );
  },
  async badgesOfUser(userId) {
    return state.eventBadges
      .filter((b) => b.user_id === userId)
      .map((b) => ({
        event_id: b.event_id,
        badge: b.badge,
        earned_at: b.earned_at ?? "2026-01-01T00:00:00.000Z",
      }));
  },
  async badgeCounts(eventId) {
    const counts = new Map<string, number>();
    for (const b of state.eventBadges.filter((b) => b.event_id === eventId)) {
      counts.set(b.badge, (counts.get(b.badge) ?? 0) + 1);
    }
    return [...counts].map(([badge, earned]) => ({ badge, earned }));
  },
});

/**
 * An awards night's tables over plain arrays, with their keys reimplemented
 * (a category needs its night, a game once per category, a pick only of its
 * own category's nominees) so the service is tested against what the
 * database refuses.
 */
export const createInMemoryAwards = (
  state: InMemoryState,
): AwardsRepository => {
  const byPosition = <T extends { position: number; id: number }>(rows: T[]) =>
    [...rows].sort((a, b) => a.position - b.position || a.id - b.id);

  return {
    async shows(eventIds) {
      return state.awardShows.filter((s) => eventIds.includes(s.event_id));
    },
    async saveShow(show) {
      state.awardShows = [
        ...state.awardShows.filter((s) => s.event_id !== show.event_id),
        { ...show },
      ];
    },

    async listCategories(eventIds) {
      return byPosition(
        state.awardCategories.filter((c) => eventIds.includes(c.event_id)),
      );
    },
    async findCategory(id) {
      return state.awardCategories.find((c) => c.id === id) ?? null;
    },
    async findCategories(ids) {
      return state.awardCategories.filter((c) => ids.includes(c.id));
    },
    async insertCategory(category) {
      if (!state.awardShows.some((s) => s.event_id === category.event_id)) {
        throw pgError("23503");
      }
      if (
        state.awardCategories.some(
          (c) => c.event_id === category.event_id && c.slug === category.slug,
        )
      ) {
        throw pgError("23505");
      }
      const row: AwardCategoryRow = { id: nextId++, ...category };
      state.awardCategories.push(row);
      return row;
    },
    async updateCategory(id, patch) {
      const row = state.awardCategories.find((c) => c.id === id);
      if (!row) return null;
      Object.assign(row, patch);
      return row;
    },
    async deleteCategory(id) {
      const gone = new Set(
        state.awardNominees
          .filter((n) => n.category_id === id)
          .map((n) => n.id),
      );
      state.awardCategories = state.awardCategories.filter((c) => c.id !== id);
      state.awardNominees = state.awardNominees.filter((n) => !gone.has(n.id));
      state.awardPicks = state.awardPicks.filter((p) => p.category_id !== id);
    },

    async listNominees(categoryIds) {
      return byPosition(
        state.awardNominees.filter((n) => categoryIds.includes(n.category_id)),
      );
    },
    async findNominee(id) {
      return state.awardNominees.find((n) => n.id === id) ?? null;
    },
    async insertNominee(nominee) {
      if (
        nominee.game_id !== null &&
        state.awardNominees.some(
          (n) =>
            n.category_id === nominee.category_id &&
            n.game_id === nominee.game_id,
        )
      ) {
        throw pgError("23505");
      }
      const row: AwardNomineeRow = { id: nextId++, won: false, ...nominee };
      state.awardNominees.push(row);
      return row;
    },
    async updateNominee(id, patch) {
      const row = state.awardNominees.find((n) => n.id === id);
      if (!row) return null;
      Object.assign(row, patch);
      return row;
    },
    async deleteNominee(id) {
      state.awardNominees = state.awardNominees.filter((n) => n.id !== id);
      state.awardPicks = state.awardPicks.filter((p) => p.nominee_id !== id);
    },
    async nomineesForGame(gameId) {
      return state.awardNominees.filter((n) => n.game_id === gameId);
    },

    async pickCounts(eventId) {
      const categories = new Set(
        state.awardCategories
          .filter((c) => c.event_id === eventId)
          .map((c) => c.id),
      );
      const counts = new Map<number, number>();
      for (const pick of state.awardPicks) {
        if (!categories.has(pick.category_id)) continue;
        counts.set(pick.nominee_id, (counts.get(pick.nominee_id) ?? 0) + 1);
      }
      return [...counts].map(([nominee_id, picks]) => ({ nominee_id, picks }));
    },
    async picks(userId, categoryIds) {
      return state.awardPicks
        .filter(
          (p) => p.user_id === userId && categoryIds.includes(p.category_id),
        )
        .map(({ category_id, nominee_id }) => ({ category_id, nominee_id }));
    },
    async setPick(userId, categoryId, nomineeId) {
      const nominee = state.awardNominees.find((n) => n.id === nomineeId);
      if (!nominee || nominee.category_id !== categoryId) {
        throw pgError("23503");
      }
      state.awardPicks = [
        ...state.awardPicks.filter(
          (p) => !(p.user_id === userId && p.category_id === categoryId),
        ),
        { user_id: userId, category_id: categoryId, nominee_id: nomineeId },
      ];
    },
    async clearPick(userId, categoryId) {
      state.awardPicks = state.awardPicks.filter(
        (p) => !(p.user_id === userId && p.category_id === categoryId),
      );
    },
    /** What refresh_award_result_badges does. */
    async refreshResultBadges(eventId) {
      state.eventBadges = state.eventBadges.filter(
        (b) =>
          !(
            b.event_id === eventId &&
            ["called-it", "sharp-eye"].includes(b.badge)
          ),
      );
      const categories = state.awardCategories
        .filter((c) => c.event_id === eventId)
        .sort(
          (a, b) =>
            Number(b.headline) - Number(a.headline) ||
            a.position - b.position ||
            a.id - b.id,
        );
      const won = (nomineeId: number) =>
        state.awardNominees.find((n) => n.id === nomineeId)?.won ?? false;
      const picks = state.awardPicks.filter((p) =>
        categories.some((c) => c.id === p.category_id),
      );
      for (const p of picks) {
        if (p.category_id === categories[0]?.id && won(p.nominee_id)) {
          state.eventBadges.push({
            user_id: p.user_id,
            event_id: eventId,
            badge: "called-it",
          });
        }
      }
      const decided = categories.filter((c) =>
        state.awardNominees.some((n) => n.category_id === c.id && n.won),
      ).length;
      if (decided < 3) return;
      for (const user of new Set(picks.map((p) => p.user_id))) {
        const called = picks.filter(
          (p) => p.user_id === user && won(p.nominee_id),
        ).length;
        if (called * 2 >= decided) {
          state.eventBadges.push({
            user_id: user,
            event_id: eventId,
            badge: "sharp-eye",
          });
        }
      }
    },
  };
};

/** A showcase's tables over plain arrays, with its keys reimplemented. */
export const createInMemoryShowcase = (
  state: InMemoryState,
): ShowcaseRepository => ({
  async showcases(eventIds) {
    return state.showcaseEvents.filter((id) => eventIds.includes(id));
  },
  async saveShowcase(eventId) {
    if (!state.showcaseEvents.includes(eventId)) {
      state.showcaseEvents.push(eventId);
    }
  },
  async reveals(eventIds) {
    return state.showcaseReveals
      .filter((r) => eventIds.includes(r.event_id))
      .sort((a, b) => a.position - b.position || a.id - b.id);
  },
  async findReveal(id) {
    return state.showcaseReveals.find((r) => r.id === id) ?? null;
  },
  async insertReveal(reveal) {
    if (!state.showcaseEvents.includes(reveal.event_id)) {
      throw pgError("23503");
    }
    const row: RevealRow = { id: nextId++, ...reveal };
    state.showcaseReveals.push(row);
    return row;
  },
  async setRevealPosition(id, position) {
    const row = state.showcaseReveals.find((r) => r.id === id);
    if (row) row.position = position;
  },
  async deleteReveal(id) {
    state.showcaseReveals = state.showcaseReveals.filter((r) => r.id !== id);
    state.showcaseHype = state.showcaseHype.filter((h) => h.reveal_id !== id);
  },
  async revealsForGame(gameId) {
    return state.showcaseReveals.filter((r) => r.game_id === gameId);
  },
  async hypeCounts(eventId) {
    const own = new Set(
      state.showcaseReveals
        .filter((r) => r.event_id === eventId)
        .map((r) => r.id),
    );
    const counts = new Map<number, number>();
    for (const h of state.showcaseHype) {
      if (own.has(h.reveal_id)) {
        counts.set(h.reveal_id, (counts.get(h.reveal_id) ?? 0) + 1);
      }
    }
    return [...counts].map(([reveal_id, hype]) => ({ reveal_id, hype }));
  },
  async hypeOf(userId, revealIds) {
    return state.showcaseHype
      .filter((h) => h.user_id === userId && revealIds.includes(h.reveal_id))
      .map((h) => h.reveal_id);
  },
  async hype(userId, revealId) {
    if (
      !state.showcaseHype.some(
        (h) => h.user_id === userId && h.reveal_id === revealId,
      )
    ) {
      state.showcaseHype.push({ user_id: userId, reveal_id: revealId });
    }
  },
  async unhype(userId, revealId) {
    state.showcaseHype = state.showcaseHype.filter(
      (h) => !(h.user_id === userId && h.reveal_id === revealId),
    );
  },
});

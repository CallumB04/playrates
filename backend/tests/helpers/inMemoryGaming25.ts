import { FALLBACK_ACCENT } from "@playrates/shared";
import type {
  Gaming25CardRow,
  Gaming25Repository,
} from "../../src/modules/gaming25/gaming25.repository.js";
import type { InMemoryState } from "./inMemoryRepos.js";

export interface Gaming25Row {
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Gaming25PickState {
  user_id: string;
  category: string;
  game_id: number;
  updated_at: string;
}

export interface Gaming25Love {
  owner_id: string;
  user_id: string;
}

/**
 * The Gaming 25 repository over plain arrays, with the view's counts and
 * the RPC's make-on-first-pick reimplemented, so the service is tested
 * against what the SQL keeps.
 */
export const createInMemoryGaming25 = (
  state: InMemoryState,
): Gaming25Repository => {
  // Each change a tick later, so the picture's version moves with it.
  let clock = Date.parse("2026-03-01T00:00:00.000Z");
  const tick = () => new Date((clock += 1000)).toISOString();

  const cardOf = (row: Gaming25Row): Gaming25CardRow | null => {
    const owner = state.profiles.find((p) => p.id === row.user_id);
    if (!owner) return null;
    const picks = state.gaming25Picks.filter((p) => p.user_id === row.user_id);
    return {
      ...row,
      pick_count: picks.length,
      love_count: state.gaming25Loves.filter((l) => l.owner_id === row.user_id)
        .length,
      centre_game_id:
        picks.find((p) => p.category === "all_time_favourite")?.game_id ?? null,
      owner_username: owner.username,
      owner_avatar_url: owner.avatar_url,
      owner_accent: owner.accent ?? FALLBACK_ACCENT,
      owner_visibility: owner.profile_visibility,
    };
  };

  return {
    async card(userId) {
      const row = state.gaming25s.find((g) => g.user_id === userId);
      return row ? cardOf(row) : null;
    },

    async mostLoved(limit, minPicks) {
      return state.gaming25s
        .flatMap((g) => cardOf(g) ?? [])
        .filter(
          (c) => c.owner_visibility === "everyone" && c.pick_count >= minPicks,
        )
        .sort(
          (a, b) =>
            b.love_count - a.love_count ||
            b.updated_at.localeCompare(a.updated_at),
        )
        .slice(0, limit);
    },

    async picks(userId) {
      return state.gaming25Picks
        .filter((p) => p.user_id === userId)
        .map(({ category, game_id }) => ({ category, game_id }));
    },

    async setPick(userId, category, gameId) {
      const at = tick();
      const grid = state.gaming25s.find((g) => g.user_id === userId);
      if (grid) grid.updated_at = at;
      else {
        state.gaming25s.push({
          user_id: userId,
          created_at: at,
          updated_at: at,
        });
      }
      state.gaming25Picks = state.gaming25Picks.filter(
        (p) => !(p.user_id === userId && p.category === category),
      );
      if (gameId !== null) {
        state.gaming25Picks.push({
          user_id: userId,
          category,
          game_id: gameId,
          updated_at: at,
        });
      }
    },

    async hasLoved(userId, ownerId) {
      return state.gaming25Loves.some(
        (l) => l.user_id === userId && l.owner_id === ownerId,
      );
    },

    async addLove(userId, ownerId) {
      if (!(await this.hasLoved(userId, ownerId))) {
        state.gaming25Loves.push({ owner_id: ownerId, user_id: userId });
      }
    },

    async removeLove(userId, ownerId) {
      state.gaming25Loves = state.gaming25Loves.filter(
        (l) => !(l.user_id === userId && l.owner_id === ownerId),
      );
    },

    async loveCount(ownerId) {
      return state.gaming25Loves.filter((l) => l.owner_id === ownerId).length;
    },
  };
};

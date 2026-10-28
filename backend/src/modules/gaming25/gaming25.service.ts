import {
  gaming25Label,
  GAMING_25_CATEGORIES,
  GAMING_25_SHOWCASE_MIN,
  isUpvoteMilestone,
  type Game,
  type Gaming25,
  type Gaming25Category,
  type Gaming25Summary,
  type LoveResult,
} from "@playrates/shared";
import { AppError } from "../../lib/AppError.js";
import type { ProfileRow } from "../../types/database.types.js";
import type { GamesRepository } from "../games/games.repository.js";
import { toGame } from "../games/games.mapper.js";
import type { NotificationsRepository } from "../notifications/notifications.repository.js";
import { gaming25LovesKey } from "../notifications/notifications.mapper.js";
import type { ProfileGate } from "../profiles/profileGate.js";
import type { ProfilesRepository } from "../profiles/profiles.repository.js";
import { toProfileVisibility } from "../profiles/profiles.mapper.js";
import { inGridOrder, toGaming25Owner } from "./gaming25.mapper.js";
import type { Gaming25Repository } from "./gaming25.repository.js";

/** Every cell, filled or not, for the picture and the link preview. */
export interface Gaming25Cells {
  username: string;
  cells: { category: Gaming25Category; label: string; game: Game | null }[];
  pickCount: number;
  updatedAt: string | null;
}

export const createGaming25Service = (
  repo: Gaming25Repository,
  games: GamesRepository,
  profiles: ProfilesRepository,
  notifications: NotificationsRepository,
  gate: ProfileGate,
) => {
  /** The owner's picks with their games, in grid order. A game flagged
   *  adult since it was picked is not shown, as with favourites. */
  const picksOf = async (userId: string) => {
    const picks = inGridOrder(await repo.picks(userId));
    if (picks.length === 0) return [];
    const rows = await games.findByIds([
      ...new Set(picks.map((p) => p.gameId)),
    ]);
    const byId = new Map(
      rows.filter((row) => !row.has_sexual_content).map((r) => [r.id, r]),
    );
    return picks.flatMap(({ category, gameId }) => {
      const row = byId.get(gameId);
      return row ? [{ category, game: toGame(row) }] : [];
    });
  };

  const gridOf = async (
    profile: ProfileRow,
    viewerId?: string,
  ): Promise<Gaming25> => {
    const card = await repo.card(profile.id);
    const [picks, loved] = await Promise.all([
      card ? picksOf(profile.id) : [],
      card && viewerId && viewerId !== profile.id
        ? repo.hasLoved(viewerId, profile.id)
        : false,
    ]);
    return {
      owner: toGaming25Owner(profile),
      picks,
      loveCount: card?.love_count ?? 0,
      lovedByViewer: loved,
      updatedAt: card?.updated_at ?? null,
    };
  };

  const ownProfile = async (userId: string) => {
    const profile = await profiles.findById(userId);
    if (!profile) throw AppError.notFound("Profile");
    return profile;
  };

  return {
    /** Part of a profile past its card, so the profile's visibility decides. */
    async forUsername(username: string, viewerId?: string): Promise<Gaming25> {
      return gridOf(await gate(username, viewerId), viewerId);
    },

    /** Any game in the catalogue, logged or not; the same one may fill
     *  more than one cell. */
    async setPick(
      userId: string,
      category: Gaming25Category,
      gameId: number,
    ): Promise<Gaming25> {
      const [row] = await games.findByIds([gameId]);
      if (!row) throw AppError.notFound("Game");
      // Shown to everyone who may see the profile, adult filter or not.
      if (row.has_sexual_content) {
        throw AppError.validation("An adult game can't go in a Gaming 25");
      }
      await repo.setPick(userId, category, gameId);
      return gridOf(await ownProfile(userId));
    },

    async clearPick(
      userId: string,
      category: Gaming25Category,
    ): Promise<Gaming25> {
      await repo.setPick(userId, category, null);
      return gridOf(await ownProfile(userId));
    },

    async toggleLove(viewerId: string, username: string): Promise<LoveResult> {
      const profile = await gate(username, viewerId);
      if (profile.id === viewerId) {
        throw AppError.forbidden("You can't love your own Gaming 25");
      }
      const card = await repo.card(profile.id);
      if (!card || card.pick_count === 0) throw AppError.notFound("Gaming 25");

      const loved = await repo.hasLoved(viewerId, profile.id);
      if (loved) await repo.removeLove(viewerId, profile.id);
      else await repo.addLove(viewerId, profile.id);
      const loveCount = await repo.loveCount(profile.id);

      if (!loved && isUpvoteMilestone(loveCount)) {
        await notifications.raiseMilestone(
          profile.id,
          "gaming_25_love_milestone",
          gaming25LovesKey(profile.id),
          loveCount,
          { username: profile.username },
        );
      }
      return { loveCount, lovedByViewer: !loved };
    },

    /** Grids anyone may see, enough of them filled to be worth a look. */
    async mostLoved(limit: number): Promise<Gaming25Summary[]> {
      const rows = await repo.mostLoved(limit, GAMING_25_SHOWCASE_MIN);
      const centreIds = rows.flatMap((r) =>
        r.centre_game_id === null ? [] : [r.centre_game_id],
      );
      const centres = new Map(
        (centreIds.length > 0 ? await games.findByIds(centreIds) : [])
          .filter((row) => !row.has_sexual_content)
          .map((row) => {
            const game = toGame(row);
            return [
              game.id,
              { id: game.id, title: game.title, coverUrl: game.coverUrl },
            ];
          }),
      );
      return rows.map((row) => ({
        owner: toGaming25Owner({
          username: row.owner_username,
          avatar_url: row.owner_avatar_url,
          accent: row.owner_accent,
        }),
        pickCount: row.pick_count,
        loveCount: row.love_count,
        centre:
          row.centre_game_id === null
            ? null
            : (centres.get(row.centre_game_id) ?? null),
        updatedAt: row.updated_at,
      }));
    },

    /**
     * Every cell of a grid anyone may see, for the shared picture and the
     * link preview; null for one behind a private or friends-only profile,
     * since those travel beyond the site.
     */
    async publicCells(username: string): Promise<Gaming25Cells | null> {
      const profile = await profiles.findByUsername(username);
      if (
        !profile ||
        toProfileVisibility(profile.profile_visibility) !== "everyone"
      ) {
        return null;
      }
      const card = await repo.card(profile.id);
      const picks = card ? await picksOf(profile.id) : [];
      const byCategory = new Map(picks.map((p) => [p.category, p.game]));
      return {
        username: profile.username,
        cells: GAMING_25_CATEGORIES.map(({ key }) => ({
          category: key,
          label: gaming25Label(key),
          game: byCategory.get(key) ?? null,
        })),
        pickCount: picks.length,
        updatedAt: card?.updated_at ?? null,
      };
    },
  };
};

export type Gaming25Service = ReturnType<typeof createGaming25Service>;

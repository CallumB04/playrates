import {
  relationFor,
  type FriendActivity,
  type FriendEdge,
  type GameFan,
  type SharedPlayer,
  type TasteMatch,
  type FriendRelation,
  type Paginated,
  type Pagination,
} from "@playrates/shared";
import { AppError } from "../../lib/AppError.js";
import { paginate, toRange } from "../../lib/pagination.js";
import { isOnline, toAccent } from "../profiles/profiles.mapper.js";
import type { ProfilesRepository } from "../profiles/profiles.repository.js";
import {
  friendAcceptedKey,
  friendRequestKey,
} from "../notifications/notifications.mapper.js";
import type { NotificationsRepository } from "../notifications/notifications.repository.js";
import { toFriendUser } from "./friends.mapper.js";
import { createArtworkLookup } from "../games/artwork.js";
import type { GamesRepository } from "../games/games.repository.js";
import type { ProfileGate } from "../profiles/profileGate.js";
import type {
  FriendshipWithUsers,
  FriendsRepository,
} from "./friends.repository.js";

/** The edge as `viewerId` sees it — the embedded user is always the other
 *  party, and pending reads as sent or received depending on the side. */
const toEdge = (
  row: FriendshipWithUsers,
  viewerId: string,
): FriendEdge | null => {
  const otherRow = row.user_a_id === viewerId ? row.user_b : row.user_a;
  if (!otherRow) return null;

  return {
    status: relationFor(row.status, row.requested_by, viewerId),
    user: toFriendUser(otherRow),
    createdAt: row.created_at,
  };
};

const TASTE_MATCHES_SHOWN = 12;
const GAME_FANS_SHOWN = 8;
const SHARED_PLAYERS_SHOWN = 6;

export const createFriendsService = (
  repo: FriendsRepository,
  profiles: ProfilesRepository,
  notifications: NotificationsRepository,
  gate: ProfileGate,
  games: Pick<GamesRepository, "findByIds">,
) => {
  const artworkFor = createArtworkLookup(games);
  /** Opt-in, so signed out and unknown both mean no. */
  const canSeeExplicit = async (viewerId?: string): Promise<boolean> =>
    viewerId
      ? ((await profiles.findById(viewerId))?.show_sexual_content ?? false)
      : false;

  return {
    async listForUser(
      userId: string,
      status?: FriendRelation,
    ): Promise<FriendEdge[]> {
      const rows = await repo.listForUser(userId);
      const edges = rows
        .map((row) => toEdge(row, userId))
        .filter((e): e is FriendEdge => e !== null);

      return status ? edges.filter((e) => e.status === status) : edges;
    },

    async listForUsername(
      username: string,
      viewerId: string | undefined,
      status?: FriendRelation,
    ): Promise<FriendEdge[]> {
      const profile = await gate(username, viewerId);
      return this.listForUser(profile.id, status);
    },

    /** The requester is always the authenticated caller, never a supplied id. */
    /** What the people you follow have been logging, newest first. */
    async activityFor(
      viewerId: string,
      pagination: Pagination,
    ): Promise<Paginated<FriendActivity>> {
      const { from, to } = toRange(pagination);
      const { rows, total } = await repo.activityFor(
        viewerId,
        from,
        to,
        await canSeeExplicit(viewerId),
      );
      const art = await artworkFor(rows.map((row) => row.game_id));

      return paginate(
        rows.map((row) => ({
          logId: row.log_id,
          actor: {
            id: row.user_id,
            username: row.actor_username,
            avatarUrl: row.actor_avatar_url,
            accent: toAccent(row.actor_accent),
            bio: "",
            online: isOnline(row.actor_last_seen_at),
          },
          game: {
            id: row.game_id,
            title: row.game_title,
            coverUrl: row.game_cover_url,
            artworkUrl: art.get(row.game_id) ?? null,
          },
          status: row.status,
          playedStatus: row.played_status,
          rating: row.rating === null ? null : Number(row.rating),
          system: row.system_slug ?? null,
          hoursPlayed:
            row.hours_played === null ? null : Number(row.hours_played),
          at: row.updated_at,
        })),
        pagination,
        total,
      );
    },

    async tasteMatches(callerId: string): Promise<TasteMatch[]> {
      const rows = await repo.tasteMatches(callerId, TASTE_MATCHES_SHOWN);
      return rows.map((row) => ({
        user: toFriendUser(row),
        shared: row.shared,
        agreement: row.agreement,
      }));
    },

    async sharedPlayers(callerId: string): Promise<SharedPlayer[]> {
      const rows = await repo.sharedPlayers(callerId, SHARED_PLAYERS_SHOWN);
      const byId = new Map(
        (
          await games.findByIds([...new Set(rows.flatMap((r) => r.game_ids))])
        ).map((g) => [g.id, g]),
      );
      return rows.map((row) => ({
        user: toFriendUser(row),
        shared: row.shared,
        games: row.game_ids.flatMap((id) => {
          const game = byId.get(id);
          return game
            ? [{ id: game.id, title: game.title, coverUrl: game.cover_url }]
            : [];
        }),
      }));
    },

    async gameFans(gameId: number): Promise<GameFan[]> {
      const rows = await repo.gameFans(gameId, GAME_FANS_SHOWN);
      return rows.map((row) => ({
        user: toFriendUser(row),
        rating: Number(row.rating),
      }));
    },

    async sendRequest(callerId: string, targetId: string): Promise<FriendEdge> {
      if (callerId === targetId) {
        throw new AppError(
          422,
          "self_friend",
          "You cannot send yourself a friend request",
        );
      }

      const target = await profiles.findById(targetId);
      if (!target) throw AppError.notFound("Profile");

      // guards against a double click creating a second pending relationship
      const existing = await repo.find(callerId, targetId);
      if (existing) {
        throw AppError.conflict(
          "already_exists",
          existing.status === "accepted"
            ? "You are already friends with this user"
            : "There is already a pending request with this user",
        );
      }

      const row = await repo.create(callerId, targetId);
      await notifications.raise({
        userId: targetId,
        kind: "friend_request",
        actorId: callerId,
        dedupeKey: friendRequestKey(callerId),
      });

      const edge = toEdge(row, callerId);
      if (!edge) throw AppError.internal("Friendship did not persist");
      return edge;
    },

    async acceptRequest(
      callerId: string,
      otherId: string,
    ): Promise<FriendEdge> {
      const existing = await repo.find(callerId, otherId);
      if (!existing || existing.status !== "pending") {
        throw AppError.notFound("Friend request");
      }

      // only the recipient can accept
      if (existing.requested_by === callerId) {
        throw AppError.forbidden("You cannot accept your own request");
      }

      const row = await repo.accept(callerId, otherId);
      await notifications.markReadByKey(callerId, friendRequestKey(otherId));
      // The sender hears back; otherwise a request goes out into silence.
      await notifications.raise({
        userId: otherId,
        kind: "friend_accepted",
        actorId: callerId,
        dedupeKey: friendAcceptedKey(callerId),
      });

      const edge = toEdge(row, callerId);
      if (!edge) throw AppError.internal("Friendship did not persist");
      return edge;
    },

    // Decline, cancel and unfriend are the same operation.
    async removeRelationship(callerId: string, otherId: string): Promise<void> {
      const existing = await repo.find(callerId, otherId);
      if (!existing) throw AppError.notFound("Friendship");
      await repo.remove(callerId, otherId);

      /* Acting on a request reads its notification, wherever you acted from.
         Withdrawing one reads the other party's, which would otherwise wait
         unread for an answer there is no longer anything to give. Each is a
         no-op where there is no such notification. */
      await notifications.markReadByKey(callerId, friendRequestKey(otherId));
      if (existing.status === "pending" && existing.requested_by === callerId) {
        await notifications.markReadByKey(otherId, friendRequestKey(callerId));
      }
    },
  };
};

export type FriendsService = ReturnType<typeof createFriendsService>;

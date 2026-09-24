import {
  relationFor,
  type FriendActivity,
  type FriendEdge,
  type FriendRelation,
  type Paginated,
  type Pagination,
} from "@playrates/shared";
import { AppError } from "../../lib/AppError.js";
import { paginate, toRange } from "../../lib/pagination.js";
import { isOnline, toAccent } from "../profiles/profiles.mapper.js";
import type { ProfilesRepository } from "../profiles/profiles.repository.js";
import type {
  FriendProfileRow,
  FriendshipWithUsers,
  FriendsRepository,
} from "./friends.repository.js";

const toFriendUser = (row: FriendProfileRow) => ({
  id: row.id,
  username: row.username,
  avatarUrl: row.avatar_url,
  accent: toAccent(row.accent),
  bio: row.bio,
  online: isOnline(row.last_seen_at),
});

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

export const createFriendsService = (
  repo: FriendsRepository,
  profiles: ProfilesRepository,
) => ({
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
    status?: FriendRelation,
  ): Promise<FriendEdge[]> {
    const profile = await profiles.findByUsername(username);
    if (!profile) throw AppError.notFound("Profile");
    return this.listForUser(profile.id, status);
  },

  /** The requester is always the authenticated caller, never a supplied id. */
  /** What the people you follow have been logging, newest first. */
  async activityFor(
    viewerId: string,
    pagination: Pagination,
  ): Promise<Paginated<FriendActivity>> {
    const { from, to } = toRange(pagination);
    const { rows, total } = await repo.activityFor(viewerId, from, to);

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
        },
        status: row.status,
        playedStatus: row.played_status,
        rating: row.rating === null ? null : Number(row.rating),
        hoursPlayed:
          row.hours_played === null ? null : Number(row.hours_played),
        at: row.updated_at,
      })),
      pagination,
      total,
    );
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
    const edge = toEdge(row, callerId);
    if (!edge) throw AppError.internal("Friendship did not persist");
    return edge;
  },

  async acceptRequest(callerId: string, otherId: string): Promise<FriendEdge> {
    const existing = await repo.find(callerId, otherId);
    if (!existing || existing.status !== "pending") {
      throw AppError.notFound("Friend request");
    }

    // only the recipient can accept
    if (existing.requested_by === callerId) {
      throw AppError.forbidden("You cannot accept your own request");
    }

    const row = await repo.accept(callerId, otherId);
    const edge = toEdge(row, callerId);
    if (!edge) throw AppError.internal("Friendship did not persist");
    return edge;
  },

  // Decline, cancel and unfriend are the same operation.
  async removeRelationship(callerId: string, otherId: string): Promise<void> {
    const existing = await repo.find(callerId, otherId);
    if (!existing) throw AppError.notFound("Friendship");
    await repo.remove(callerId, otherId);
  },
});

export type FriendsService = ReturnType<typeof createFriendsService>;

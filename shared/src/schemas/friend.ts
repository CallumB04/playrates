import { z } from "zod";

/**
 * The status as the *viewer* sees it. Stored as one canonical row plus a
 * requested_by column; these three values are derived per viewer.
 */
export const FRIEND_RELATIONS = [
  "friend",
  "request-sent",
  "request-received",
] as const;

export const FriendRelationSchema = z.enum(FRIEND_RELATIONS);
export type FriendRelation = z.infer<typeof FriendRelationSchema>;

export const FriendRequestSchema = z
  .object({
    userId: z.string().uuid(),
  })
  .strict();

export const FriendQuerySchema = z.object({
  status: FriendRelationSchema.optional(),
});

export interface FriendUser {
  id: string;
  username: string;
  avatarUrl: string | null;
  bio: string;
  online: boolean;
}

/** The other party is embedded, so a friend list needs no follow-up requests. */
export interface FriendEdge {
  status: FriendRelation;
  user: FriendUser;
  createdAt: string;
}

/** What a relationship looks like from one side. Exported so it's testable —
 *  pending means "sent" to one user and "received" to the other. */
export const relationFor = (
  status: "pending" | "accepted",
  requestedBy: string,
  viewerId: string,
): FriendRelation => {
  if (status === "accepted") return "friend";
  return requestedBy === viewerId ? "request-sent" : "request-received";
};

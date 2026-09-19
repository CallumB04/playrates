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
  pictureUrl: string | null;
  bio: string;
  online: boolean;
}

/**
 * The other party is embedded. The old profile page issued one request per
 * friend to resolve names and avatars.
 */
export interface FriendEdge {
  status: FriendRelation;
  user: FriendUser;
  createdAt: string;
}

/**
 * Derives what a relationship looks like from one side of it.
 *
 * Pure and exported because it is the single trickiest piece of logic in the
 * friends feature, and it is worth testing directly.
 */
export const relationFor = (
  status: "pending" | "accepted",
  requestedBy: string,
  viewerId: string,
): FriendRelation => {
  if (status === "accepted") return "friend";
  return requestedBy === viewerId ? "request-sent" : "request-received";
};

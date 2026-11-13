import { z } from "zod";
import type { ProfileAccent } from "./profileAccent.js";

/** The status as the viewer sees it. Stored as one row plus requested_by;
 *  these three are derived per viewer. */
export const FRIEND_RELATIONS = [
  "friend",
  "request-sent",
  "request-received",
] as const;

export const FriendRelationSchema = z.enum(FRIEND_RELATIONS);
export type FriendRelation = z.infer<typeof FriendRelationSchema>;

export const FriendRequestSchema = z
  .object({
    userId: z.guid(),
  })
  .strict();

export const FriendQuerySchema = z.object({
  status: FriendRelationSchema.optional(),
});

export interface FriendUser {
  id: string;
  username: string;
  avatarUrl: string | null;
  /** Colours the generated avatar where there is no picture. */
  accent: ProfileAccent;
  bio: string;
  online: boolean;
}

/** Someone who rates games the way you do. */
export interface TasteMatch {
  user: FriendUser;
  /** Games you have both rated. */
  shared: number;
  /** How close your ratings of them sit, out of 100. */
  agreement: number;
}

/** Someone who plays what you play: games you've both logged, a few
 *  named. Public profiles only, adult games never among them. */
export interface SharedPlayer {
  user: FriendUser;
  /** Games you have both played or are playing. */
  shared: number;
  games: { id: number; title: string; coverUrl: string | null }[];
}

/** Someone who rated a game highly, with what they gave it. */
export interface GameFan {
  user: FriendUser;
  rating: number;
}

/** The other party is embedded, so a friend list needs no follow-up requests. */
export interface FriendEdge {
  status: FriendRelation;
  user: FriendUser;
  createdAt: string;
}

/** One thing a friend did, for the home feed. A log rather than an event —
 *  there's no event table, and updated_at is close enough. */
export interface FriendActivity {
  logId: number;
  actor: FriendUser;
  game: {
    id: number;
    title: string;
    coverUrl: string | null;
    /** Wide art for a card's backdrop. Absent from an API older than it. */
    artworkUrl?: string | null;
  };
  status: string;
  playedStatus: string | null;
  rating: number | null;
  hoursPlayed: number | null;
  /** The console the log is for, so a second platform reads as one. */
  system: string | null;
  at: string;
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

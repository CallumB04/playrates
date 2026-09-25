import { z } from "zod";
import { PaginationSchema } from "./common.js";
import type { ProfileAccent } from "./profileAccent.js";
import { RichTextDocSchema, type RichTextDoc } from "./richText.js";

/**
 * What a thread is about. Only games take new threads today; patch notes is
 * the one official thread and is never created through the API. A new kind
 * of subject is a new member here and a new column on the table.
 */
export const THREAD_SUBJECT_KINDS = ["game", "patch_notes"] as const;
export type ThreadSubjectKind = (typeof THREAD_SUBJECT_KINDS)[number];

export const ThreadSubjectInputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("game"), gameId: z.number().int().positive() }),
]);

export const ThreadTitleSchema = z
  .string()
  .trim()
  .min(3, "A title needs at least 3 characters")
  .max(120, "A title must be at most 120 characters");

export const CreateThreadInputSchema = z
  .object({
    subject: ThreadSubjectInputSchema,
    title: ThreadTitleSchema,
    body: RichTextDocSchema,
  })
  .strict();
export type CreateThreadInput = z.infer<typeof CreateThreadInputSchema>;

export const CreateMessageInputSchema = z
  .object({
    body: RichTextDocSchema,
    /** The message being answered. A reply to a reply lands under the same
     *  parent, since replies nest one level deep. */
    parentId: z.number().int().positive().nullish(),
  })
  .strict();
export type CreateMessageInput = z.infer<typeof CreateMessageInputSchema>;

export const UpdateMessageInputSchema = z
  .object({ body: RichTextDocSchema })
  .strict();
export type UpdateMessageInput = z.infer<typeof UpdateMessageInputSchema>;

export const THREAD_SORTS = ["active", "new"] as const;
export type ThreadSort = (typeof THREAD_SORTS)[number];

export const ThreadListQuerySchema = PaginationSchema.extend({
  gameId: z.coerce.number().int().positive().optional(),
  /** A username: only threads they have started or replied to. */
  participant: z.string().trim().min(1).max(24).optional(),
  sort: z.enum(THREAD_SORTS).default("active"),
});
export type ThreadListQuery = z.infer<typeof ThreadListQuerySchema>;

export const ThreadIdParamSchema = z.object({
  threadId: z.coerce.number().int().positive(),
});

export const MessageIdParamSchema = z.object({
  messageId: z.coerce.number().int().positive(),
});

/** Trending counts messages over this many days, everywhere it is shown. */
export const TRENDING_WINDOW_DAYS = 14;

/** Pictures are compressed in the browser to these terms, as avatars are. */
export const COMMUNITY_IMAGE_MIME = "image/webp";
export const COMMUNITY_IMAGE_MAX_BYTES = 1024 * 1024;
export const COMMUNITY_IMAGE_MAX_EDGE = 1600;

export interface CommunityAuthor {
  id: string;
  username: string;
  firstName: string | null;
  avatarUrl: string | null;
  accent: ProfileAccent;
}

export interface ThreadContributor {
  username: string;
  avatarUrl: string | null;
  accent: ProfileAccent;
}

export type ThreadSubject =
  | {
      kind: "game";
      game: {
        id: number;
        title: string;
        slug: string;
        coverUrl: string | null;
      };
    }
  | { kind: "patch_notes" };

export interface ThreadCard {
  id: number;
  title: string;
  subject: ThreadSubject;
  /** Null once the account that opened it is gone. */
  author: CommunityAuthor | null;
  createdAt: string;
  lastActivityAt: string;
  messageCount: number;
  contributorCount: number;
  /** The most recent few to post, newest first. */
  contributors: ThreadContributor[];
  /** Messages in the trending window. */
  recentMessageCount: number;
}

export interface TrendingThread extends ThreadCard {
  rank: number;
  /** Messages per day across the trending window, oldest first. */
  activity: number[];
}

export interface CommunityMessage {
  id: number;
  threadId: number;
  parentId: number | null;
  author: CommunityAuthor | null;
  /** Null once deleted; the message keeps its place for the replies under it. */
  body: RichTextDoc | null;
  isOpening: boolean;
  deleted: boolean;
  createdAt: string;
  editedAt: string | null;
  voteCount: number;
  votedByViewer: boolean;
  canEdit: boolean;
  canDelete: boolean;
  /** Only top-level messages carry replies. */
  replies: CommunityMessage[];
}

export interface ThreadDetail {
  thread: ThreadCard;
  /** Top-level messages, oldest first, the opening message among them. */
  messages: CommunityMessage[];
  /** Whether the viewer can add a message. False on patch notes for anyone
   *  who is not an admin; true when signed out, where posting asks for one. */
  canPost: boolean;
  canDeleteThread: boolean;
}

export interface PatchNotesSummary {
  thread: ThreadCard;
  /** The newest entry, named by its first heading. */
  latest: { title: string | null; createdAt: string } | null;
}

export interface VoteResult {
  voteCount: number;
  votedByViewer: boolean;
}

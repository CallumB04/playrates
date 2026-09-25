import { toPlainText } from "@playrates/shared";
import type {
  CommunityAuthor,
  CommunityMessage,
  LatestReply,
  TalkedAboutGame,
  RichTextDoc,
  ThreadCard,
  ThreadSubject,
} from "@playrates/shared";
import { toAccent } from "../profiles/profiles.mapper.js";
import type {
  LatestReplyRow,
  MessageCardRow,
  TalkedAboutGameRow,
  ThreadCardRow,
} from "./community.repository.js";

const toAuthor = (
  id: string | null,
  row: {
    author_username: string | null;
    author_first_name: string | null;
    author_avatar_url: string | null;
    author_accent: string | null;
  },
): CommunityAuthor | null =>
  id && row.author_username
    ? {
        id,
        username: row.author_username,
        firstName: row.author_first_name,
        avatarUrl: row.author_avatar_url,
        accent: toAccent(row.author_accent),
      }
    : null;

const toSubject = (row: ThreadCardRow): ThreadSubject =>
  row.subject_kind === "game" && row.game_id !== null
    ? {
        kind: "game",
        game: {
          id: row.game_id,
          title: row.game_title ?? "Unknown game",
          slug: row.game_slug ?? "",
          coverUrl: row.game_cover_url,
        },
      }
    : { kind: "patch_notes" };

export const toThreadCard = (row: ThreadCardRow): ThreadCard => ({
  id: row.id,
  title: row.title,
  subject: toSubject(row),
  author: toAuthor(row.author_id, row),
  createdAt: row.created_at,
  lastActivityAt: row.last_activity_at,
  messageCount: Number(row.message_count ?? 0),
  contributorCount: Number(row.contributor_count ?? 0),
  contributors: (row.contributors ?? []).map((c) => ({
    username: c.username,
    avatarUrl: c.avatar_url,
    accent: toAccent(c.accent),
  })),
  recentMessageCount: Number(row.recent_message_count ?? 0),
});

export const toTalkedAboutGame = (
  row: TalkedAboutGameRow,
): TalkedAboutGame => ({
  game: { id: row.game_id, title: row.title, coverUrl: row.cover_url },
  recentMessageCount: Number(row.recent_message_count),
});

export const toLatestReply = (row: LatestReplyRow): LatestReply => ({
  id: row.id,
  threadId: row.thread_id,
  threadTitle: row.thread_title,
  // Quoted where nobody chose to open it, so its spoilers stay covered.
  excerpt: row.body
    ? toPlainText(row.body as RichTextDoc, { hideSpoilers: true }).slice(0, 140)
    : "",
  author: toAuthor(row.author_id, row),
  createdAt: row.created_at,
});

/** Who is looking, and at what, which is everything a permission needs. */
export interface MessageViewer {
  viewerId: string | undefined;
  isAdmin: boolean;
  isPatchNotes: boolean;
  votedIds: Set<number>;
}

/* The opening message is what the thread says, so nobody edits it, and it
   goes only with the thread. The exception is patch notes, where every entry
   is the admin's to correct. */
export const canEditMessage = (
  row: Pick<MessageCardRow, "author_id" | "is_opening" | "deleted_at">,
  viewer: Pick<MessageViewer, "viewerId" | "isAdmin" | "isPatchNotes">,
): boolean => {
  if (row.deleted_at || !viewer.viewerId) return false;
  if (viewer.isPatchNotes) return viewer.isAdmin;
  return !row.is_opening && row.author_id === viewer.viewerId;
};

export const canDeleteMessage = (
  row: Pick<MessageCardRow, "author_id" | "is_opening" | "deleted_at">,
  viewer: Pick<MessageViewer, "viewerId" | "isAdmin">,
): boolean =>
  !row.deleted_at &&
  !row.is_opening &&
  !!viewer.viewerId &&
  (viewer.isAdmin || row.author_id === viewer.viewerId);

export const toMessage = (
  row: MessageCardRow,
  viewer: MessageViewer,
  replies: CommunityMessage[] = [],
): CommunityMessage => ({
  id: row.id,
  threadId: row.thread_id,
  parentId: row.parent_id,
  author: row.deleted_at ? null : toAuthor(row.author_id, row),
  body: row.deleted_at ? null : (row.body as RichTextDoc),
  isOpening: row.is_opening,
  deleted: row.deleted_at !== null,
  createdAt: row.created_at,
  editedAt: row.edited_at,
  voteCount: Number(row.vote_count ?? 0),
  votedByViewer: viewer.votedIds.has(row.id),
  canEdit: canEditMessage(row, viewer),
  canDelete: canDeleteMessage(row, viewer),
  replies,
});

/**
 * Rows, oldest first, into top-level messages with their replies beneath.
 * A deleted reply is dropped. A deleted top-level message stays only while
 * something under it is still standing, so the answers keep their question.
 */
export const buildMessageTree = (
  rows: MessageCardRow[],
  viewer: MessageViewer,
): CommunityMessage[] => {
  const byCreated = [...rows].sort(
    (a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id,
  );

  const repliesByParent = new Map<number, CommunityMessage[]>();
  for (const row of byCreated) {
    if (row.parent_id === null || row.deleted_at) continue;
    const list = repliesByParent.get(row.parent_id) ?? [];
    list.push(toMessage(row, viewer));
    repliesByParent.set(row.parent_id, list);
  }

  return byCreated.flatMap((row) => {
    if (row.parent_id !== null) return [];
    const replies = repliesByParent.get(row.id) ?? [];
    if (row.deleted_at && replies.length === 0) return [];
    return [toMessage(row, viewer, replies)];
  });
};

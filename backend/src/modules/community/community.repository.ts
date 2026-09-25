import type { ThreadSort } from "@playrates/shared";
import type { Db } from "../../config/supabase.js";
import type {
  CommunityMessageRow,
  CommunityThreadRow,
} from "../../types/database.types.js";

/** A row of the community_thread_cards view. */
export interface ThreadCardRow extends CommunityThreadRow {
  game_title: string | null;
  game_slug: string | null;
  game_cover_url: string | null;
  game_has_sexual_content: boolean;
  author_username: string | null;
  author_first_name: string | null;
  author_avatar_url: string | null;
  author_accent: string | null;
  message_count: number;
  contributor_count: number;
  recent_message_count: number;
  contributors: {
    username: string;
    avatar_url: string | null;
    accent: string | null;
  }[];
}

/** A row of the community_message_cards view. */
export interface MessageCardRow extends CommunityMessageRow {
  author_username: string | null;
  author_first_name: string | null;
  author_avatar_url: string | null;
  author_accent: string | null;
  vote_count: number;
}

export interface ListThreadsOptions {
  gameId?: number;
  sort: ThreadSort;
  from: number;
  to: number;
  showSexualContent: boolean;
}

export interface CommunityRepository {
  /** Game threads only; the patch notes have a place of their own. */
  listThreads(
    options: ListThreadsOptions,
  ): Promise<{ rows: ThreadCardRow[]; total: number }>;
  /** Most messages in the trending window first. Threads with none in it
   *  are not trending, however busy they once were. */
  listTrending(
    limit: number,
    showSexualContent: boolean,
  ): Promise<ThreadCardRow[]>;
  /** Messages per day over the trending window, oldest first. */
  threadActivity(threadId: number): Promise<number[]>;
  /** Game threads this person has posted in, most recent post first. The
   *  patch notes are left out: they have a place of their own, and a row in
   *  a profile list would pass them off as an ordinary thread. */
  listThreadsByParticipant(
    userId: string,
    limit: number,
  ): Promise<ThreadCardRow[]>;
  findThread(id: number): Promise<ThreadCardRow | null>;
  findPatchNotes(): Promise<ThreadCardRow | null>;
  listMessages(threadId: number): Promise<MessageCardRow[]>;
  findMessage(id: number): Promise<MessageCardRow | null>;
  /** The thread and its opening message, together. Returns the thread id. */
  createThread(input: {
    authorId: string;
    gameId: number;
    title: string;
    body: unknown;
  }): Promise<number>;
  insertMessage(input: {
    threadId: number;
    parentId: number | null;
    authorId: string;
    body: unknown;
  }): Promise<MessageCardRow>;
  updateMessageBody(id: number, body: unknown): Promise<MessageCardRow>;
  softDeleteMessage(id: number): Promise<void>;
  deleteThread(id: number): Promise<void>;
  votedMessageIds(userId: string, messageIds: number[]): Promise<Set<number>>;
  hasVoted(userId: string, messageId: number): Promise<boolean>;
  addVote(userId: string, messageId: number): Promise<void>;
  removeVote(userId: string, messageId: number): Promise<void>;
  voteCount(messageId: number): Promise<number>;
}

const THREADS = "community_thread_cards";
const MESSAGES = "community_message_cards";

export const createCommunityRepository = (db: Db): CommunityRepository => ({
  async listThreads({ gameId, sort, from, to, showSexualContent }) {
    let builder = db
      .from(THREADS)
      .select("*", { count: "exact" })
      .eq("subject_kind", "game");

    if (gameId !== undefined) builder = builder.eq("game_id", gameId);
    if (!showSexualContent) {
      builder = builder.eq("game_has_sexual_content", false);
    }

    const { data, error, count } = await builder
      .order(sort === "new" ? "created_at" : "last_activity_at", {
        ascending: false,
      })
      // id breaks ties, or deep pages repeat and skip rows.
      .order("id", { ascending: false })
      .range(from, to);
    if (error) throw error;
    return { rows: (data ?? []) as ThreadCardRow[], total: count ?? 0 };
  },

  async listTrending(limit, showSexualContent) {
    let builder = db
      .from(THREADS)
      .select("*")
      .eq("subject_kind", "game")
      .gt("recent_message_count", 0);

    if (!showSexualContent) {
      builder = builder.eq("game_has_sexual_content", false);
    }

    const { data, error } = await builder
      .order("recent_message_count", { ascending: false })
      .order("last_activity_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as ThreadCardRow[];
  },

  async threadActivity(threadId) {
    const { data, error } = await db.rpc("community_thread_activity", {
      p_thread_id: threadId,
    });
    if (error) throw error;
    return ((data ?? []) as { message_count: number }[]).map((d) =>
      Number(d.message_count),
    );
  },

  async listThreadsByParticipant(userId, limit) {
    /* Newest posts first, then the first `limit` distinct threads among them.
       A page of posts is plenty: nobody's five most recent threads are more
       than a hundred posts apart. */
    const { data, error } = await db
      .from("community_messages")
      .select("thread_id")
      .eq("author_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;

    const ids = [
      ...new Set(
        (data ?? []).map((r) => (r as { thread_id: number }).thread_id),
      ),
    ];
    if (ids.length === 0) return [];

    // Filtered before the cut to `limit`, so a skipped thread leaves no gap.
    const cards = await db
      .from(THREADS)
      .select("*")
      .eq("subject_kind", "game")
      .in("id", ids);
    if (cards.error) throw cards.error;
    const byId = new Map(
      ((cards.data ?? []) as ThreadCardRow[]).map((row) => [row.id, row]),
    );
    return ids.flatMap((id) => byId.get(id) ?? []).slice(0, limit);
  },

  async findThread(id) {
    const { data, error } = await db
      .from(THREADS)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data as ThreadCardRow | null) ?? null;
  },

  async findPatchNotes() {
    const { data, error } = await db
      .from(THREADS)
      .select("*")
      .eq("subject_kind", "patch_notes")
      .maybeSingle();
    if (error) throw error;
    return (data as ThreadCardRow | null) ?? null;
  },

  async listMessages(threadId) {
    const { data, error } = await db
      .from(MESSAGES)
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at")
      .order("id")
      .limit(1000);
    if (error) throw error;
    return (data ?? []) as MessageCardRow[];
  },

  async findMessage(id) {
    const { data, error } = await db
      .from(MESSAGES)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data as MessageCardRow | null) ?? null;
  },

  async createThread({ authorId, gameId, title, body }) {
    const { data, error } = await db.rpc("create_community_thread", {
      p_author_id: authorId,
      p_subject_kind: "game",
      p_game_id: gameId,
      p_title: title,
      p_body: body,
    });
    if (error) throw error;
    return Number(data);
  },

  /* Writes go to the table, then the card is read back for the author and
     the tally, as reviews do. */
  async insertMessage({ threadId, parentId, authorId, body }) {
    const { data, error } = await db
      .from("community_messages")
      .insert({
        thread_id: threadId,
        parent_id: parentId,
        author_id: authorId,
        body,
      })
      .select("id")
      .single();
    if (error) throw error;

    const row = await this.findMessage((data as { id: number }).id);
    if (!row) throw new Error("message vanished immediately after write");
    return row;
  },

  async updateMessageBody(id, body) {
    const { error } = await db
      .from("community_messages")
      .update({ body, edited_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;

    const row = await this.findMessage(id);
    if (!row) throw new Error("message vanished immediately after write");
    return row;
  },

  async softDeleteMessage(id) {
    const { error } = await db
      .from("community_messages")
      .update({ body: null, deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },

  async deleteThread(id) {
    const { error } = await db.from("community_threads").delete().eq("id", id);
    if (error) throw error;
  },

  async votedMessageIds(userId, messageIds) {
    if (messageIds.length === 0) return new Set();
    const { data, error } = await db
      .from("community_message_votes")
      .select("message_id")
      .eq("user_id", userId)
      .in("message_id", messageIds);
    if (error) throw error;
    return new Set(
      (data ?? []).map((r) => (r as { message_id: number }).message_id),
    );
  },

  async hasVoted(userId, messageId) {
    const { count, error } = await db
      .from("community_message_votes")
      .select("message_id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("message_id", messageId);
    if (error) throw error;
    return (count ?? 0) > 0;
  },

  async addVote(userId, messageId) {
    const { error } = await db
      .from("community_message_votes")
      .upsert(
        { user_id: userId, message_id: messageId },
        { onConflict: "message_id,user_id" },
      );
    if (error) throw error;
  },

  async removeVote(userId, messageId) {
    const { error } = await db
      .from("community_message_votes")
      .delete()
      .eq("user_id", userId)
      .eq("message_id", messageId);
    if (error) throw error;
  },

  async voteCount(messageId) {
    const { count, error } = await db
      .from("community_message_votes")
      .select("message_id", { count: "exact", head: true })
      .eq("message_id", messageId);
    if (error) throw error;
    return count ?? 0;
  },
});

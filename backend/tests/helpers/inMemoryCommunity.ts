import { TRENDING_WINDOW_DAYS, toPlainText } from "@playrates/shared";
import type { RichTextDoc } from "@playrates/shared";
import type {
  CommunityRepository,
  MessageCardRow,
  ThreadCardRow,
} from "../../src/modules/community/community.repository.js";
import type { CommunityMessageRow } from "../../src/types/database.types.js";
import type { InMemoryState } from "./inMemoryRepos.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The community repository over plain arrays. The view arithmetic — counts
 * that skip deleted messages, the newest four faces, the fourteen-day window —
 * is reimplemented here so the service is tested against the same contract
 * the SQL keeps.
 */
export const createInMemoryCommunity = (
  state: InMemoryState,
): CommunityRepository => {
  let nextThreadId = 5000;
  let nextMessageId = 6000;

  const profile = (id: string | null) =>
    id ? state.profiles.find((p) => p.id === id) : undefined;

  const live = (threadId: number) =>
    state.communityMessages.filter(
      (m) => m.thread_id === threadId && !m.deleted_at,
    );

  const card = (threadId: number): ThreadCardRow | null => {
    const t = state.communityThreads.find((x) => x.id === threadId);
    if (!t) return null;
    const game = state.games.find((g) => g.id === t.game_id);
    const author = profile(t.author_id);
    const messages = live(t.id);
    const windowStart = Date.now() - TRENDING_WINDOW_DAYS * DAY_MS;

    const lastPost = new Map<string, string>();
    for (const m of messages) {
      if (!m.author_id) continue;
      const seen = lastPost.get(m.author_id);
      if (!seen || m.created_at > seen) lastPost.set(m.author_id, m.created_at);
    }
    const contributors = [...lastPost.entries()]
      .sort((a, b) => b[1].localeCompare(a[1]))
      .slice(0, 4)
      .flatMap(([id]) => {
        const p = profile(id);
        return p
          ? [
              {
                username: p.username,
                avatar_url: p.avatar_url,
                accent: p.accent,
              },
            ]
          : [];
      });

    return {
      ...t,
      game_title: game?.title ?? null,
      game_slug: game?.slug ?? null,
      game_cover_url: game ? (game.box_art_url ?? game.cover_url) : null,
      game_has_sexual_content: game?.has_sexual_content ?? false,
      author_username: author?.username ?? null,
      author_first_name: author?.first_name ?? null,
      author_avatar_url: author?.avatar_url ?? null,
      author_accent: author?.accent ?? null,
      message_count: messages.length,
      contributor_count: new Set(
        messages.map((m) => m.author_id).filter(Boolean),
      ).size,
      recent_message_count: messages.filter(
        (m) => Date.parse(m.created_at) > windowStart,
      ).length,
      contributors,
    };
  };

  const messageCard = (m: CommunityMessageRow): MessageCardRow => {
    const author = profile(m.author_id);
    return {
      ...m,
      author_username: author?.username ?? null,
      author_first_name: author?.first_name ?? null,
      author_avatar_url: author?.avatar_url ?? null,
      author_accent: author?.accent ?? null,
      vote_count: state.communityVotes.filter((v) => v.message_id === m.id)
        .length,
    };
  };

  const cards = () => state.communityThreads.flatMap((t) => card(t.id) ?? []);

  // community_thread_search: the title, the game, or a standing message.
  const matches = (c: ThreadCardRow, search: string) => {
    const term = search.toLowerCase();
    return (
      c.title.toLowerCase().includes(term) ||
      (c.game_title ?? "").toLowerCase().includes(term) ||
      live(c.id).some((m) =>
        toPlainText(m.body as RichTextDoc)
          .toLowerCase()
          .includes(term),
      )
    );
  };

  const insert = (
    row: Omit<
      CommunityMessageRow,
      "id" | "created_at" | "edited_at" | "deleted_at"
    >,
  ): CommunityMessageRow => {
    const created: CommunityMessageRow = {
      ...row,
      id: nextMessageId++,
      created_at: new Date().toISOString(),
      edited_at: null,
      deleted_at: null,
    };
    state.communityMessages.push(created);
    // the trigger
    const thread = state.communityThreads.find((t) => t.id === row.thread_id);
    if (thread) thread.last_activity_at = created.created_at;
    return created;
  };

  return {
    async listThreads({
      gameId,
      participantId,
      search,
      sort,
      from,
      to,
      showSexualContent,
    }) {
      const key = sort === "new" ? "created_at" : "last_activity_at";
      const joined = new Set(
        state.communityMessages
          .filter((m) => m.author_id === participantId && !m.deleted_at)
          .map((m) => m.thread_id),
      );
      const rows = cards()
        .filter((c) => c.subject_kind === "game")
        .filter((c) => gameId === undefined || c.game_id === gameId)
        .filter((c) => !participantId || joined.has(c.id))
        .filter((c) => !search || matches(c, search))
        .filter((c) => showSexualContent || !c.game_has_sexual_content)
        .sort((a, b) => b[key].localeCompare(a[key]) || b.id - a.id);
      return { rows: rows.slice(from, to + 1), total: rows.length };
    },

    async listTrending(limit, showSexualContent) {
      return cards()
        .filter((c) => c.subject_kind === "game" && c.recent_message_count > 0)
        .filter((c) => showSexualContent || !c.game_has_sexual_content)
        .sort(
          (a, b) =>
            b.recent_message_count - a.recent_message_count ||
            b.last_activity_at.localeCompare(a.last_activity_at),
        )
        .slice(0, limit);
    },

    async listTalkedAboutGames(limit, showSexualContent) {
      const windowStart = Date.now() - TRENDING_WINDOW_DAYS * DAY_MS;
      const byGame = new Map<number, { count: number; latest: string }>();
      for (const m of state.communityMessages) {
        if (m.deleted_at || Date.parse(m.created_at) <= windowStart) continue;
        const thread = state.communityThreads.find((t) => t.id === m.thread_id);
        if (!thread || thread.subject_kind !== "game" || !thread.game_id)
          continue;
        const game = state.games.find((g) => g.id === thread.game_id);
        if (!game || (!showSexualContent && game.has_sexual_content)) continue;
        const seen = byGame.get(game.id) ?? { count: 0, latest: "" };
        byGame.set(game.id, {
          count: seen.count + 1,
          latest: m.created_at > seen.latest ? m.created_at : seen.latest,
        });
      }
      return [...byGame.entries()]
        .sort(
          ([a, x], [b, y]) =>
            y.count - x.count || y.latest.localeCompare(x.latest) || a - b,
        )
        .slice(0, limit)
        .map(([id, { count }]) => {
          const game = state.games.find((g) => g.id === id)!;
          return {
            game_id: id,
            title: game.title,
            cover_url: game.box_art_url ?? game.cover_url,
            recent_message_count: count,
          };
        });
    },

    async listLatestReplies(limit, showSexualContent) {
      return state.communityMessages
        .filter((m) => !m.is_opening && !m.deleted_at)
        .flatMap((m) => {
          const thread = state.communityThreads.find(
            (t) => t.id === m.thread_id,
          );
          if (!thread || thread.subject_kind !== "game") return [];
          const game = state.games.find((g) => g.id === thread.game_id);
          if (!showSexualContent && game?.has_sexual_content) return [];
          const author = profile(m.author_id);
          return [
            {
              id: m.id,
              thread_id: thread.id,
              thread_title: thread.title,
              plain_text: toPlainText(m.body as RichTextDoc),
              created_at: m.created_at,
              author_id: m.author_id,
              author_username: author?.username ?? null,
              author_first_name: author?.first_name ?? null,
              author_avatar_url: author?.avatar_url ?? null,
              author_accent: author?.accent ?? null,
            },
          ];
        })
        .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)
        .slice(0, limit);
    },

    async threadActivity(threadId) {
      const today = new Date().toISOString().slice(0, 10);
      const days = Array.from({ length: TRENDING_WINDOW_DAYS }, (_, i) =>
        new Date(Date.parse(today) - (TRENDING_WINDOW_DAYS - 1 - i) * DAY_MS)
          .toISOString()
          .slice(0, 10),
      );
      const messages = live(threadId);
      return days.map(
        (day) =>
          messages.filter((m) => m.created_at.slice(0, 10) === day).length,
      );
    },

    async listThreadsByParticipant(userId, limit) {
      const ids = [
        ...new Set(
          state.communityMessages
            .filter((m) => m.author_id === userId && !m.deleted_at)
            .sort((a, b) => b.created_at.localeCompare(a.created_at))
            .map((m) => m.thread_id),
        ),
      ];
      return ids
        .flatMap((id) => card(id) ?? [])
        .filter((c) => c.subject_kind === "game")
        .slice(0, limit);
    },

    async findThread(id) {
      return card(id);
    },

    async findPatchNotes() {
      const t = state.communityThreads.find(
        (x) => x.subject_kind === "patch_notes",
      );
      return t ? card(t.id) : null;
    },

    async listMessages(threadId) {
      return state.communityMessages
        .filter((m) => m.thread_id === threadId)
        .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id)
        .map(messageCard);
    },

    async findMessage(id) {
      const m = state.communityMessages.find((x) => x.id === id);
      return m ? messageCard(m) : null;
    },

    async createThread({ authorId, gameId, title, body }) {
      const now = new Date().toISOString();
      const id = nextThreadId++;
      state.communityThreads.push({
        id,
        subject_kind: "game",
        game_id: gameId,
        title,
        author_id: authorId,
        created_at: now,
        last_activity_at: now,
      });
      insert({
        thread_id: id,
        parent_id: null,
        author_id: authorId,
        body,
        is_opening: true,
      });
      return id;
    },

    async insertMessage({ threadId, parentId, authorId, body }) {
      return messageCard(
        insert({
          thread_id: threadId,
          parent_id: parentId,
          author_id: authorId,
          body,
          is_opening: false,
        }),
      );
    },

    async updateMessageBody(id, body) {
      const m = state.communityMessages.find((x) => x.id === id);
      if (!m) throw new Error("no such message");
      m.body = body;
      m.edited_at = new Date().toISOString();
      return messageCard(m);
    },

    async softDeleteMessage(id) {
      const m = state.communityMessages.find((x) => x.id === id);
      if (!m) return;
      m.body = null;
      m.deleted_at = new Date().toISOString();
    },

    async listBodiesByAuthor(userId) {
      return state.communityMessages
        .filter((m) => m.author_id === userId && !m.deleted_at)
        .map((m) => m.body);
    },

    async deleteThread(id) {
      // the community_threads_clear_notifications trigger
      state.notifications = state.notifications.filter(
        (n) =>
          !(
            [
              "community_reply",
              "community_thread_activity",
              "community_upvote_milestone",
            ].includes(n.kind) && n.data.threadId === id
          ),
      );
      const gone = new Set(
        state.communityMessages
          .filter((m) => m.thread_id === id)
          .map((m) => m.id),
      );
      state.communityThreads = state.communityThreads.filter(
        (t) => t.id !== id,
      );
      state.communityMessages = state.communityMessages.filter(
        (m) => !gone.has(m.id),
      );
      state.communityVotes = state.communityVotes.filter(
        (v) => !gone.has(v.message_id),
      );
    },

    async votedMessageIds(userId, messageIds) {
      return new Set(
        state.communityVotes
          .filter(
            (v) => v.user_id === userId && messageIds.includes(v.message_id),
          )
          .map((v) => v.message_id),
      );
    },

    async hasVoted(userId, messageId) {
      return state.communityVotes.some(
        (v) => v.user_id === userId && v.message_id === messageId,
      );
    },

    async addVote(userId, messageId) {
      if (!(await this.hasVoted(userId, messageId))) {
        state.communityVotes.push({ message_id: messageId, user_id: userId });
      }
    },

    async removeVote(userId, messageId) {
      state.communityVotes = state.communityVotes.filter(
        (v) => !(v.user_id === userId && v.message_id === messageId),
      );
    },

    async voteCount(messageId) {
      return state.communityVotes.filter((v) => v.message_id === messageId)
        .length;
    },
  };
};

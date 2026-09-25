import type {
  CommunityMessage,
  CreateMessageInput,
  CreateThreadInput,
  Paginated,
  PatchNotesSummary,
  RichTextDoc,
  ThreadCard,
  ThreadDetail,
  ThreadListQuery,
  TrendingThread,
  VoteResult,
} from "@playrates/shared";
import {
  COMMUNITY_IMAGE_MAX_BYTES,
  firstHeading,
  isWebp,
} from "@playrates/shared";
import { AppError } from "../../lib/AppError.js";
import { assertAdmin } from "../../lib/authz.js";
import { paginate, toRange } from "../../lib/pagination.js";
import type { CommunityImageStore } from "../../config/communityImageStore.js";
import type { GamesRepository } from "../games/games.repository.js";
import type { ProfilesRepository } from "../profiles/profiles.repository.js";
import type { ProfileRow } from "../../types/database.types.js";
import {
  buildMessageTree,
  toMessage,
  toThreadCard,
  type MessageViewer,
} from "./community.mapper.js";
import type {
  CommunityRepository,
  MessageCardRow,
  ThreadCardRow,
} from "./community.repository.js";

export const createCommunityService = (
  repo: CommunityRepository,
  profiles: ProfilesRepository,
  games: GamesRepository,
  images: CommunityImageStore,
) => {
  const viewerProfile = async (
    viewerId: string | undefined,
  ): Promise<ProfileRow | null> =>
    viewerId ? await profiles.findById(viewerId) : null;

  const viewerFor = async (
    viewerId: string | undefined,
    thread: ThreadCardRow,
    rows: MessageCardRow[],
  ): Promise<MessageViewer> => {
    const profile = await viewerProfile(viewerId);
    return {
      viewerId,
      isAdmin: profile?.is_admin ?? false,
      isPatchNotes: thread.subject_kind === "patch_notes",
      votedIds: viewerId
        ? await repo.votedMessageIds(
            viewerId,
            rows.map((r) => r.id),
          )
        : new Set(),
    };
  };

  const requireThread = async (threadId: number): Promise<ThreadCardRow> => {
    const thread = await repo.findThread(threadId);
    if (!thread) throw AppError.notFound("Thread");
    return thread;
  };

  const requireMessage = async (messageId: number): Promise<MessageCardRow> => {
    const message = await repo.findMessage(messageId);
    if (!message || message.deleted_at) throw AppError.notFound("Message");
    return message;
  };

  /* Only pictures that went through our upload. Anything else would let a
     message load whatever it liked from wherever it liked. */
  const assertOwnImages = (body: RichTextDoc): void => {
    for (const block of body.content) {
      if (block.type === "image" && !images.owns(block.attrs.src)) {
        throw AppError.validation("Images must be uploaded to PlayRates");
      }
    }
  };

  const messageFor = async (
    viewerId: string,
    row: MessageCardRow,
  ): Promise<CommunityMessage> => {
    const thread = await requireThread(row.thread_id);
    return toMessage(row, await viewerFor(viewerId, thread, [row]));
  };

  return {
    async listThreads(
      { gameId, sort, ...pagination }: ThreadListQuery,
      viewerId?: string,
    ): Promise<Paginated<ThreadCard>> {
      if (gameId !== undefined && !(await games.findById(gameId))) {
        throw AppError.notFound("Game");
      }
      const { from, to } = toRange(pagination);
      const { rows, total } = await repo.listThreads({
        gameId,
        sort,
        from,
        to,
        /* Someone on a game's own page went looking for it; the community
           front page is shown to people who went looking for neither. */
        showSexualContent:
          gameId !== undefined ||
          ((await viewerProfile(viewerId))?.show_sexual_content ?? false),
      });
      return paginate(rows.map(toThreadCard), pagination, total);
    },

    async trending(
      limit: number,
      viewerId?: string,
    ): Promise<TrendingThread[]> {
      const rows = await repo.listTrending(
        limit,
        (await viewerProfile(viewerId))?.show_sexual_content ?? false,
      );
      return Promise.all(
        rows.map(async (row, index) => ({
          ...toThreadCard(row),
          rank: index + 1,
          activity: await repo.threadActivity(row.id),
        })),
      );
    },

    async patchNotes(): Promise<PatchNotesSummary> {
      const thread = await repo.findPatchNotes();
      if (!thread) throw AppError.notFound("Patch notes");

      const latest = (await repo.listMessages(thread.id))
        .filter((m) => m.parent_id === null && !m.deleted_at)
        .at(-1);
      return {
        thread: toThreadCard(thread),
        latest: latest
          ? {
              title: firstHeading(latest.body as RichTextDoc),
              createdAt: latest.created_at,
            }
          : null,
      };
    },

    async listByUsername(
      username: string,
      limit: number,
    ): Promise<ThreadCard[]> {
      const profile = await profiles.findByUsername(username);
      if (!profile) throw AppError.notFound("Profile");
      return (await repo.listThreadsByParticipant(profile.id, limit)).map(
        toThreadCard,
      );
    },

    async getThread(
      threadId: number,
      viewerId?: string,
    ): Promise<ThreadDetail> {
      const thread = await requireThread(threadId);
      const rows = await repo.listMessages(threadId);
      const viewer = await viewerFor(viewerId, thread, rows);
      return {
        thread: toThreadCard(thread),
        messages: buildMessageTree(rows, viewer),
        canPost: viewer.isPatchNotes ? viewer.isAdmin : true,
        canDeleteThread: viewer.isAdmin && !viewer.isPatchNotes,
      };
    },

    async createThread(
      userId: string,
      input: CreateThreadInput,
    ): Promise<ThreadDetail> {
      const game = await games.findById(input.subject.gameId);
      if (!game) throw AppError.notFound("Game");
      assertOwnImages(input.body);

      const threadId = await repo.createThread({
        authorId: userId,
        gameId: game.id,
        title: input.title,
        body: input.body,
      });
      return this.getThread(threadId, userId);
    },

    async postMessage(
      userId: string,
      threadId: number,
      input: CreateMessageInput,
    ): Promise<CommunityMessage> {
      const thread = await requireThread(threadId);

      if (thread.subject_kind === "patch_notes") {
        assertAdmin(await profiles.findById(userId));
        if (input.parentId) {
          throw AppError.validation("Patch notes take entries, not replies");
        }
      }

      /* One level deep: a reply to a reply joins its parent's replies, and a
         reply to the opening message is a top-level message of its own. */
      let parentId: number | null = null;
      if (input.parentId) {
        const parent = await repo.findMessage(input.parentId);
        if (!parent || parent.thread_id !== threadId) {
          throw AppError.notFound("Message");
        }
        if (parent.deleted_at) {
          throw AppError.validation("That message has been deleted");
        }
        parentId = parent.is_opening ? null : (parent.parent_id ?? parent.id);
      }

      assertOwnImages(input.body);
      const row = await repo.insertMessage({
        threadId,
        parentId,
        authorId: userId,
        body: input.body,
      });
      return messageFor(userId, row);
    },

    async editMessage(
      userId: string,
      messageId: number,
      body: RichTextDoc,
    ): Promise<CommunityMessage> {
      const message = await requireMessage(messageId);
      const thread = await requireThread(message.thread_id);
      const viewer = await viewerFor(userId, thread, []);

      if (message.is_opening && !viewer.isPatchNotes) {
        throw AppError.forbidden(
          "The opening message of a thread cannot be edited",
        );
      }
      const allowed = viewer.isPatchNotes
        ? viewer.isAdmin
        : message.author_id === userId;
      if (!allowed) throw AppError.forbidden("You cannot edit this message");

      assertOwnImages(body);
      return messageFor(userId, await repo.updateMessageBody(messageId, body));
    },

    async deleteMessage(userId: string, messageId: number): Promise<void> {
      const message = await requireMessage(messageId);
      if (message.is_opening) {
        throw AppError.forbidden(
          "The opening message goes only with its thread",
        );
      }
      if (message.author_id !== userId) {
        assertAdmin(await profiles.findById(userId));
      }
      await repo.softDeleteMessage(messageId);
    },

    async deleteThread(userId: string, threadId: number): Promise<void> {
      assertAdmin(await profiles.findById(userId));
      const thread = await requireThread(threadId);
      if (thread.subject_kind === "patch_notes") {
        throw AppError.forbidden("The patch notes cannot be deleted");
      }
      await repo.deleteThread(threadId);
    },

    /** A toggle, as on reviews: idempotent by primary key. */
    async toggleVote(userId: string, messageId: number): Promise<VoteResult> {
      const message = await requireMessage(messageId);
      if (message.author_id === userId) {
        throw AppError.forbidden("You cannot upvote your own message");
      }

      const voted = await repo.hasVoted(userId, messageId);
      if (voted) await repo.removeVote(userId, messageId);
      else await repo.addVote(userId, messageId);

      return {
        voteCount: await repo.voteCount(messageId),
        votedByViewer: !voted,
      };
    },

    async uploadImage(userId: string, bytes: Buffer): Promise<{ url: string }> {
      if (bytes.length === 0)
        throw AppError.badRequest("No image was uploaded");
      if (bytes.length > COMMUNITY_IMAGE_MAX_BYTES) {
        throw AppError.badRequest("That picture is too large");
      }
      if (!isWebp(bytes)) {
        throw AppError.badRequest("A picture must be a WebP image");
      }
      return { url: await images.put(userId, bytes) };
    },
  };
};

export type CommunityService = ReturnType<typeof createCommunityService>;

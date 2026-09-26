import { describe, expect, it } from "vitest";
import {
  buildMessageTree,
  canDeleteMessage,
  canEditMessage,
  type MessageViewer,
} from "../../src/modules/community/community.mapper.js";
import type { MessageCardRow } from "../../src/modules/community/community.repository.js";

const row = (overrides: Partial<MessageCardRow>): MessageCardRow => ({
  id: 1,
  thread_id: 1,
  parent_id: null,
  author_id: "a",
  body: { type: "doc", content: [] },
  is_opening: false,
  created_at: "2026-01-01T00:00:00.000Z",
  edited_at: null,
  deleted_at: null,
  author_username: "someone",
  author_first_name: null,
  author_avatar_url: null,
  author_accent: null,
  vote_count: 0,
  ...overrides,
});

const viewer = (overrides: Partial<MessageViewer> = {}): MessageViewer => ({
  viewerId: "a",
  isAdmin: false,
  isPatchNotes: false,
  votedIds: new Set(),
  ...overrides,
});

describe("buildMessageTree", () => {
  it("puts replies under their parent, both oldest first", () => {
    const tree = buildMessageTree(
      [
        row({ id: 3, parent_id: 1, created_at: "2026-01-03T00:00:00.000Z" }),
        row({ id: 1, is_opening: true }),
        row({ id: 2, parent_id: 1, created_at: "2026-01-02T00:00:00.000Z" }),
        row({ id: 4, created_at: "2026-01-04T00:00:00.000Z" }),
      ],
      viewer(),
    );

    expect(tree.map((m) => m.id)).toEqual([1, 4]);
    expect(tree[0]!.replies.map((m) => m.id)).toEqual([2, 3]);
  });

  it("drops deleted replies, and deleted messages nobody answered", () => {
    const gone = "2026-01-05T00:00:00.000Z";
    const tree = buildMessageTree(
      [
        row({ id: 1, deleted_at: gone, body: null }),
        row({ id: 2, parent_id: 1 }),
        row({ id: 3, parent_id: 1, deleted_at: gone, body: null }),
        row({ id: 4, deleted_at: gone, body: null }),
      ],
      viewer(),
    );

    expect(tree.map((m) => m.id)).toEqual([1]);
    expect(tree[0]).toMatchObject({ deleted: true, body: null, author: null });
    expect(tree[0]!.replies.map((m) => m.id)).toEqual([2]);
  });

  it("marks what the viewer has voted on", () => {
    const [message] = buildMessageTree(
      [row({ id: 7 })],
      viewer({ votedIds: new Set([7]) }),
    );
    expect(message!.votedByViewer).toBe(true);
  });
});

describe("message permissions", () => {
  it("lets an author edit and delete a reply but not an opening", () => {
    expect(canEditMessage(row({}), viewer())).toBe(true);
    expect(canDeleteMessage(row({}), viewer())).toBe(true);
    expect(canEditMessage(row({ is_opening: true }), viewer())).toBe(false);
    expect(canDeleteMessage(row({ is_opening: true }), viewer())).toBe(false);
  });

  it("gives nothing to a stranger or someone signed out", () => {
    expect(canEditMessage(row({}), viewer({ viewerId: "b" }))).toBe(false);
    expect(canDeleteMessage(row({}), viewer({ viewerId: undefined }))).toBe(
      false,
    );
  });

  it("lets an admin delete any reply but edit only patch notes", () => {
    const admin = viewer({ viewerId: "admin", isAdmin: true });
    expect(canDeleteMessage(row({}), admin)).toBe(true);
    expect(canDeleteMessage(row({ is_opening: true }), admin)).toBe(false);
    expect(
      canDeleteMessage(row({ is_opening: true }), {
        ...admin,
        isPatchNotes: true,
      }),
    ).toBe(true);
    expect(canEditMessage(row({}), admin)).toBe(false);
    expect(
      canEditMessage(row({ is_opening: true }), {
        ...admin,
        isPatchNotes: true,
      }),
    ).toBe(true);
  });
});

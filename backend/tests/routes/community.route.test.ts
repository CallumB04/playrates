import { describe, expect, it } from "vitest";
import request from "supertest";
import {
  authHeader,
  buildTestApp,
  USER_A,
  USER_B,
} from "../helpers/buildTestApp.js";
import {
  baseSeed,
  buildGame,
  buildMessage,
  buildProfile,
  buildThread,
  doc,
} from "../helpers/fixtures.js";

const ADMIN = "33333333-3333-3333-3333-333333333333";
const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS).toISOString();
const IMAGE_URL = `https://test.supabase.co/storage/v1/object/public/community-images/${USER_A}/1.webp`;

/** A game thread opened by USER_A, and the patch notes opened by the admin. */
const communitySeed = () => {
  const seed = baseSeed();
  return {
    ...seed,
    profiles: [
      ...seed.profiles,
      buildProfile({ id: ADMIN, username: "admin", is_admin: true }),
    ],
    communityThreads: [
      buildThread(),
      buildThread({
        id: 2,
        subject_kind: "patch_notes",
        game_id: null,
        title: "PlayRates patch notes",
        author_id: ADMIN,
      }),
    ],
    communityMessages: [
      buildMessage({ id: 1, is_opening: true }),
      buildMessage({
        id: 2,
        thread_id: 2,
        author_id: ADMIN,
        is_opening: true,
        body: {
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 1 },
              content: [{ type: "text", text: "v1.0 — Launch" }],
            },
          ],
        },
      }),
    ],
  };
};

const webp = () =>
  Buffer.concat([
    Buffer.from("RIFF"),
    Buffer.from([0, 0, 0, 0]),
    Buffer.from("WEBP"),
    Buffer.from("payload"),
  ]);

describe("community threads", () => {
  it("opens a thread on a game with its first message", async () => {
    const { app, state } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .post("/api/v1/community/threads")
      .set("Authorization", authHeader(USER_A))
      .send({
        subject: { kind: "game", gameId: 1 },
        title: "  Is the DLC worth it?  ",
        body: doc("Thinking of picking up Blood and Wine."),
      });

    expect(response.status).toBe(201);
    expect(response.body.thread.title).toBe("Is the DLC worth it?");
    expect(response.body.thread.subject).toMatchObject({
      kind: "game",
      game: { id: 1, title: "The Witcher 3: Wild Hunt" },
    });
    expect(response.body.messages).toHaveLength(1);
    expect(response.body.messages[0].isOpening).toBe(true);
    expect(state.communityMessages).toHaveLength(1);
  });

  it("refuses a thread on a game that does not exist", async () => {
    const { app, state } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .post("/api/v1/community/threads")
      .set("Authorization", authHeader(USER_A))
      .send({
        subject: { kind: "game", gameId: 999 },
        title: "Hello",
        body: doc(),
      });

    expect(response.status).toBe(404);
    expect(state.communityThreads).toHaveLength(0);
  });

  it("will not open a thread as patch notes", async () => {
    const { app } = buildTestApp({ seed: communitySeed() });

    const response = await request(app)
      .post("/api/v1/community/threads")
      .set("Authorization", authHeader(ADMIN))
      .send({ subject: { kind: "patch_notes" }, title: "Sneaky", body: doc() });

    expect(response.status).toBe(422);
  });

  it("refuses an empty first message", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .post("/api/v1/community/threads")
      .set("Authorization", authHeader(USER_A))
      .send({
        subject: { kind: "game", gameId: 1 },
        title: "Hello",
        body: { type: "doc", content: [{ type: "paragraph" }] },
      });

    expect(response.status).toBe(422);
  });

  it("requires a session to post", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .post("/api/v1/community/threads")
      .send({
        subject: { kind: "game", gameId: 1 },
        title: "Hello",
        body: doc(),
      });

    expect(response.status).toBe(401);
  });

  it("lists game threads with their tallies, leaving patch notes out", async () => {
    const seed = communitySeed();
    const { app } = buildTestApp({
      seed: {
        ...seed,
        communityMessages: [
          ...seed.communityMessages,
          buildMessage({ id: 3, author_id: USER_B }),
          buildMessage({ id: 4, author_id: USER_B }),
          buildMessage({
            id: 5,
            author_id: USER_A,
            deleted_at: daysAgo(0),
            body: null,
          }),
        ],
      },
    });

    const response = await request(app).get("/api/v1/community/threads");

    expect(response.status).toBe(200);
    expect(response.body.meta.total).toBe(1);
    const [card] = response.body.data;
    expect(card.messageCount).toBe(3);
    expect(card.contributorCount).toBe(2);
    expect(card.contributors).toHaveLength(2);
  });

  it("filters the list to one game", async () => {
    const seed = communitySeed();
    const { app } = buildTestApp({
      seed: {
        ...seed,
        games: [
          ...seed.games,
          buildGame({ id: 2, slug: "portal", title: "Portal" }),
        ],
        communityThreads: [
          ...seed.communityThreads,
          buildThread({ id: 3, game_id: 2 }),
        ],
      },
    });

    const response = await request(app).get(
      "/api/v1/community/threads?gameId=2",
    );

    expect(response.body.data.map((t: { id: number }) => t.id)).toEqual([3]);
  });

  it("keeps explicit games off the front page but not off their own page", async () => {
    const seed = communitySeed();
    const { app } = buildTestApp({
      seed: { ...seed, games: [buildGame({ has_sexual_content: true })] },
    });

    const front = await request(app).get("/api/v1/community/threads");
    const own = await request(app).get("/api/v1/community/threads?gameId=1");

    expect(front.body.data).toHaveLength(0);
    expect(own.body.data).toHaveLength(1);
  });
});

describe("community replies", () => {
  it("nests a reply to a reply under the same parent", async () => {
    const seed = communitySeed();
    const { app } = buildTestApp({
      seed: {
        ...seed,
        communityMessages: [
          ...seed.communityMessages,
          buildMessage({ id: 3, author_id: USER_B, created_at: daysAgo(1) }),
          buildMessage({ id: 4, parent_id: 3, created_at: daysAgo(1) }),
        ],
      },
    });

    const response = await request(app)
      .post("/api/v1/community/threads/1/messages")
      .set("Authorization", authHeader(USER_B))
      .send({ body: doc("Agreed."), parentId: 4 });

    expect(response.status).toBe(201);
    expect(response.body.parentId).toBe(3);

    const thread = await request(app).get("/api/v1/community/threads/1");
    const top = thread.body.messages.find((m: { id: number }) => m.id === 3);
    expect(top.replies.map((r: { id: number }) => r.id)).toEqual([
      4,
      response.body.id,
    ]);
  });

  it("makes a reply to the opening message a top-level one", async () => {
    const { app } = buildTestApp({ seed: communitySeed() });

    const response = await request(app)
      .post("/api/v1/community/threads/1/messages")
      .set("Authorization", authHeader(USER_B))
      .send({ body: doc(), parentId: 1 });

    expect(response.body.parentId).toBeNull();
  });

  it("refuses a parent from another thread", async () => {
    const { app } = buildTestApp({ seed: communitySeed() });

    const response = await request(app)
      .post("/api/v1/community/threads/1/messages")
      .set("Authorization", authHeader(USER_B))
      .send({ body: doc(), parentId: 2 });

    expect(response.status).toBe(404);
  });

  it("lets an author edit and delete their own reply", async () => {
    const seed = communitySeed();
    const { app, state } = buildTestApp({
      seed: {
        ...seed,
        communityMessages: [
          ...seed.communityMessages,
          buildMessage({ id: 3, author_id: USER_B }),
        ],
      },
    });

    const edited = await request(app)
      .patch("/api/v1/community/messages/3")
      .set("Authorization", authHeader(USER_B))
      .send({ body: doc("On reflection.") });
    expect(edited.status).toBe(200);
    expect(edited.body.editedAt).not.toBeNull();

    const deleted = await request(app)
      .delete("/api/v1/community/messages/3")
      .set("Authorization", authHeader(USER_B));
    expect(deleted.status).toBe(204);
    expect(
      state.communityMessages.find((m) => m.id === 3)?.deleted_at,
    ).not.toBeNull();
  });

  it("refuses to edit or delete someone else's reply", async () => {
    const seed = communitySeed();
    const { app } = buildTestApp({
      seed: {
        ...seed,
        communityMessages: [
          ...seed.communityMessages,
          buildMessage({ id: 3, author_id: USER_B }),
        ],
      },
    });

    const edit = await request(app)
      .patch("/api/v1/community/messages/3")
      .set("Authorization", authHeader(USER_A))
      .send({ body: doc() });
    const remove = await request(app)
      .delete("/api/v1/community/messages/3")
      .set("Authorization", authHeader(USER_A));

    expect(edit.status).toBe(403);
    expect(remove.status).toBe(403);
  });

  it("lets an admin delete anyone's reply", async () => {
    const seed = communitySeed();
    const { app } = buildTestApp({
      seed: {
        ...seed,
        communityMessages: [
          ...seed.communityMessages,
          buildMessage({ id: 3, author_id: USER_B }),
        ],
      },
    });

    const response = await request(app)
      .delete("/api/v1/community/messages/3")
      .set("Authorization", authHeader(ADMIN));

    expect(response.status).toBe(204);
  });

  it("keeps a deleted reply's place while it has answers", async () => {
    const seed = communitySeed();
    const { app } = buildTestApp({
      seed: {
        ...seed,
        communityMessages: [
          ...seed.communityMessages,
          buildMessage({
            id: 3,
            author_id: USER_B,
            deleted_at: daysAgo(0),
            body: null,
          }),
          buildMessage({ id: 4, parent_id: 3 }),
          buildMessage({
            id: 5,
            author_id: USER_B,
            deleted_at: daysAgo(0),
            body: null,
          }),
        ],
      },
    });

    const response = await request(app).get("/api/v1/community/threads/1");

    const ids = response.body.messages.map((m: { id: number }) => m.id);
    expect(ids).toEqual([1, 3]);
    expect(response.body.messages[1]).toMatchObject({
      deleted: true,
      body: null,
      author: null,
    });
  });
});

describe("the opening message", () => {
  it("cannot be edited or deleted by its author", async () => {
    const { app } = buildTestApp({ seed: communitySeed() });

    const edit = await request(app)
      .patch("/api/v1/community/messages/1")
      .set("Authorization", authHeader(USER_A))
      .send({ body: doc("Rewriting history.") });
    const remove = await request(app)
      .delete("/api/v1/community/messages/1")
      .set("Authorization", authHeader(USER_A));

    expect(edit.status).toBe(403);
    expect(remove.status).toBe(403);
  });

  it("goes with its thread, which only an admin can remove", async () => {
    const { app, state } = buildTestApp({ seed: communitySeed() });

    const byAuthor = await request(app)
      .delete("/api/v1/community/threads/1")
      .set("Authorization", authHeader(USER_A));
    expect(byAuthor.status).toBe(403);

    const byAdmin = await request(app)
      .delete("/api/v1/community/threads/1")
      .set("Authorization", authHeader(ADMIN));
    expect(byAdmin.status).toBe(204);
    expect(state.communityThreads.map((t) => t.id)).toEqual([2]);
    expect(state.communityMessages.some((m) => m.thread_id === 1)).toBe(false);
  });

  it("reports what the viewer may do", async () => {
    const { app } = buildTestApp({ seed: communitySeed() });

    const asAuthor = await request(app)
      .get("/api/v1/community/threads/1")
      .set("Authorization", authHeader(USER_A));
    const asAdmin = await request(app)
      .get("/api/v1/community/threads/1")
      .set("Authorization", authHeader(ADMIN));

    expect(asAuthor.body.messages[0]).toMatchObject({
      canEdit: false,
      canDelete: false,
    });
    expect(asAuthor.body.canDeleteThread).toBe(false);
    expect(asAdmin.body.canDeleteThread).toBe(true);
  });
});

describe("patch notes", () => {
  it("summarises the newest entry by its heading", async () => {
    const { app } = buildTestApp({ seed: communitySeed() });

    const response = await request(app).get("/api/v1/community/patch-notes");

    expect(response.status).toBe(200);
    expect(response.body.thread.subject).toEqual({ kind: "patch_notes" });
    expect(response.body.latest.title).toBe("v1.0 — Launch");
  });

  it("takes no posts from anyone but an admin", async () => {
    const { app } = buildTestApp({ seed: communitySeed() });

    const response = await request(app)
      .post("/api/v1/community/threads/2/messages")
      .set("Authorization", authHeader(USER_A))
      .send({ body: doc("First!") });

    expect(response.status).toBe(403);
  });

  it("takes entries from an admin, but not replies", async () => {
    const { app } = buildTestApp({ seed: communitySeed() });

    const entry = await request(app)
      .post("/api/v1/community/threads/2/messages")
      .set("Authorization", authHeader(ADMIN))
      .send({ body: doc("v1.1") });
    const reply = await request(app)
      .post("/api/v1/community/threads/2/messages")
      .set("Authorization", authHeader(ADMIN))
      .send({ body: doc("v1.1"), parentId: 2 });

    expect(entry.status).toBe(201);
    expect(reply.status).toBe(422);
  });

  it("lets the admin rewrite the placeholder but never delete the thread", async () => {
    const { app } = buildTestApp({ seed: communitySeed() });

    const edit = await request(app)
      .patch("/api/v1/community/messages/2")
      .set("Authorization", authHeader(ADMIN))
      .send({ body: doc("The real notes.") });
    const remove = await request(app)
      .delete("/api/v1/community/threads/2")
      .set("Authorization", authHeader(ADMIN));

    expect(edit.status).toBe(200);
    expect(remove.status).toBe(403);
  });

  it("can be upvoted by anyone signed in", async () => {
    const { app } = buildTestApp({ seed: communitySeed() });

    const response = await request(app)
      .post("/api/v1/community/messages/2/vote")
      .set("Authorization", authHeader(USER_A));

    expect(response.body).toEqual({ voteCount: 1, votedByViewer: true });
  });

  it("tells a non-admin they cannot post", async () => {
    const { app } = buildTestApp({ seed: communitySeed() });

    const user = await request(app)
      .get("/api/v1/community/threads/2")
      .set("Authorization", authHeader(USER_A));
    const admin = await request(app)
      .get("/api/v1/community/threads/2")
      .set("Authorization", authHeader(ADMIN));

    expect(user.body.canPost).toBe(false);
    expect(admin.body.canPost).toBe(true);
    expect(admin.body.messages[0].canEdit).toBe(true);
  });
});

describe("community votes", () => {
  it("toggles a vote on and off", async () => {
    const { app } = buildTestApp({ seed: communitySeed() });
    const vote = () =>
      request(app)
        .post("/api/v1/community/messages/1/vote")
        .set("Authorization", authHeader(USER_B));

    expect((await vote()).body).toEqual({ voteCount: 1, votedByViewer: true });
    expect((await vote()).body).toEqual({ voteCount: 0, votedByViewer: false });
  });

  it("refuses a vote on your own message", async () => {
    const { app } = buildTestApp({ seed: communitySeed() });

    const response = await request(app)
      .post("/api/v1/community/messages/1/vote")
      .set("Authorization", authHeader(USER_A));

    expect(response.status).toBe(403);
  });
});

describe("trending", () => {
  it("ranks by messages in the last fourteen days only", async () => {
    const seed = communitySeed();
    const { app } = buildTestApp({
      seed: {
        ...seed,
        communityThreads: [
          ...seed.communityThreads,
          buildThread({ id: 3, title: "Old and busy" }),
          buildThread({ id: 4, title: "Quiet" }),
        ],
        communityMessages: [
          // thread 1: the opening plus two recent
          buildMessage({ id: 1, is_opening: true, created_at: daysAgo(20) }),
          buildMessage({ id: 10, created_at: daysAgo(1) }),
          buildMessage({ id: 11, created_at: daysAgo(2) }),
          // thread 3: five messages, all outside the window
          ...[20, 21, 22, 23, 24].map((id) =>
            buildMessage({ id, thread_id: 3, created_at: daysAgo(15) }),
          ),
          // thread 4: one recent
          buildMessage({ id: 30, thread_id: 4, created_at: daysAgo(3) }),
          // patch notes never trend, however busy
          ...[40, 41, 42].map((id) =>
            buildMessage({
              id,
              thread_id: 2,
              author_id: ADMIN,
              created_at: daysAgo(0),
            }),
          ),
        ],
      },
    });

    const response = await request(app).get("/api/v1/community/trending");

    expect(response.body.map((t: { id: number }) => t.id)).toEqual([1, 4]);
    expect(response.body[0]).toMatchObject({ rank: 1, recentMessageCount: 2 });
    expect(response.body[0].activity).toHaveLength(14);
    expect(
      response.body[0].activity.reduce((a: number, b: number) => a + b, 0),
    ).toBe(2);
  });
});

describe("threads by participant", () => {
  it("lists the threads someone posted in, most recent first", async () => {
    const seed = communitySeed();
    const { app } = buildTestApp({
      seed: {
        ...seed,
        communityThreads: [...seed.communityThreads, buildThread({ id: 3 })],
        communityMessages: [
          buildMessage({ id: 1, is_opening: true, created_at: daysAgo(5) }),
          buildMessage({
            id: 2,
            thread_id: 3,
            author_id: USER_B,
            created_at: daysAgo(1),
          }),
          buildMessage({ id: 3, author_id: USER_B, created_at: daysAgo(3) }),
        ],
      },
    });

    const response = await request(app).get(
      "/api/v1/users/frienduser/community-threads",
    );

    expect(response.status).toBe(200);
    expect(response.body.map((t: { id: number }) => t.id)).toEqual([3, 1]);
  });
});

describe("threads by participant, patch notes", () => {
  it("leaves the patch notes off the admin's profile", async () => {
    const { app } = buildTestApp({ seed: communitySeed() });

    const response = await request(app).get(
      "/api/v1/users/admin/community-threads",
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("still fills the list when the newest post was a patch note", async () => {
    const seed = communitySeed();
    const { app } = buildTestApp({
      seed: {
        ...seed,
        communityThreads: [...seed.communityThreads, buildThread({ id: 3 })],
        communityMessages: [
          buildMessage({
            id: 1,
            is_opening: true,
            author_id: ADMIN,
            created_at: daysAgo(3),
          }),
          buildMessage({
            id: 5,
            thread_id: 3,
            author_id: ADMIN,
            created_at: daysAgo(2),
          }),
          buildMessage({
            id: 2,
            thread_id: 2,
            author_id: ADMIN,
            is_opening: true,
            created_at: daysAgo(0),
          }),
        ],
      },
    });

    const response = await request(app).get(
      "/api/v1/users/admin/community-threads?limit=2",
    );

    expect(response.body.map((t: { id: number }) => t.id)).toEqual([3, 1]);
  });
});

describe("community images", () => {
  it("stores an uploaded picture and returns where it lives", async () => {
    const { app, state } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .post("/api/v1/community/images")
      .set("Authorization", authHeader(USER_A))
      .set("Content-Type", "image/webp")
      .send(webp());

    expect(response.status).toBe(201);
    expect(state.communityImages.get(response.body.url)).toEqual(webp());
  });

  it("refuses bytes that are not a WebP", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .post("/api/v1/community/images")
      .set("Authorization", authHeader(USER_A))
      .set("Content-Type", "image/webp")
      .send(Buffer.from("not an image at all"));

    expect(response.status).toBe(400);
  });

  it("accepts a message showing an uploaded picture", async () => {
    const { app } = buildTestApp({ seed: communitySeed() });

    const response = await request(app)
      .post("/api/v1/community/threads/1/messages")
      .set("Authorization", authHeader(USER_B))
      .send({
        body: {
          type: "doc",
          content: [{ type: "image", attrs: { src: IMAGE_URL } }],
        },
      });

    expect(response.status).toBe(201);
  });

  it("refuses a message showing a picture from elsewhere", async () => {
    const { app } = buildTestApp({ seed: communitySeed() });

    const response = await request(app)
      .post("/api/v1/community/threads/1/messages")
      .set("Authorization", authHeader(USER_B))
      .send({
        body: {
          type: "doc",
          content: [
            { type: "image", attrs: { src: "https://evil.example/pixel.png" } },
          ],
        },
      });

    expect(response.status).toBe(422);
  });
});

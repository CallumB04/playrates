import { describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
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

const USER_C = "44444444-4444-4444-4444-444444444444";
const IMAGE = (user: string, n: number) =>
  `https://test.supabase.co/storage/v1/object/public/community-images/${user}/${n}.webp`;
const LONG_AGO = "2020-01-01T00:00:00.000Z";

const picture = (src: string) => ({
  type: "doc",
  content: [{ type: "image", attrs: { src } }],
});

/** Thread 1 opened by A. B has a top-level reply (2); C is a third voice. */
const seed = () => {
  const base = baseSeed();
  return {
    ...base,
    profiles: [
      ...base.profiles,
      buildProfile({ id: USER_C, username: "thirduser" }),
    ],
    communityThreads: [buildThread()],
    communityMessages: [
      buildMessage({ id: 1, is_opening: true, created_at: LONG_AGO }),
      buildMessage({ id: 2, author_id: USER_B, created_at: LONG_AGO }),
    ],
  };
};

const post = (app: Express, as: string, body: object) =>
  request(app)
    .post("/api/v1/community/threads/1/messages")
    .set("Authorization", authHeader(as))
    .send(body);

describe("reply notifications", () => {
  it("tells the author of the message that was answered", async () => {
    const { app, state } = buildTestApp({ seed: seed() });

    const reply = await post(app, USER_C, {
      body: doc("Hard disagree, and here is why."),
      parentId: 2,
    });

    const [note] = state.notifications.filter(
      (n) => n.kind === "community_reply",
    );
    expect(note).toMatchObject({
      user_id: USER_B,
      actor_id: USER_C,
      data: {
        threadId: 1,
        threadTitle: "Best side quest?",
        messageId: reply.body.id,
        excerpt: "Hard disagree, and here is why.",
      },
    });
  });

  it("says nothing when you answer yourself", async () => {
    const { app, state } = buildTestApp({ seed: seed() });

    await post(app, USER_B, { body: doc("Also,"), parentId: 2 });

    expect(
      state.notifications.filter((n) => n.kind === "community_reply"),
    ).toHaveLength(0);
  });

  it("goes when the reply is deleted", async () => {
    const { app, state } = buildTestApp({ seed: seed() });
    const reply = await post(app, USER_C, { body: doc("Oops"), parentId: 2 });

    await request(app)
      .delete(`/api/v1/community/messages/${reply.body.id}`)
      .set("Authorization", authHeader(USER_C));

    expect(
      state.notifications.filter((n) => n.kind === "community_reply"),
    ).toHaveLength(0);
  });

  it("reads back as a notification with the replier", async () => {
    const { app } = buildTestApp({ seed: seed() });
    await post(app, USER_C, { body: doc("Hello"), parentId: 2 });

    const inbox = await request(app)
      .get("/api/v1/me/notifications")
      .set("Authorization", authHeader(USER_B));

    expect(inbox.body.data[0]).toMatchObject({
      kind: "community_reply",
      actor: { username: "thirduser" },
      threadTitle: "Best side quest?",
    });
  });
});

describe("thread activity notifications", () => {
  const activity = (state: ReturnType<typeof buildTestApp>["state"]) =>
    state.notifications.filter(
      (n) => n.kind === "community_thread_activity" && n.user_id === USER_A,
    );

  it("counts new messages up in one notification while it is unread", async () => {
    const { app, state } = buildTestApp({ seed: seed() });

    await post(app, USER_B, { body: doc("One") });
    await post(app, USER_C, { body: doc("Two") });
    await post(app, USER_C, { body: doc("Three"), parentId: 2 });

    expect(activity(state)).toHaveLength(1);
    expect(activity(state)[0]!.data).toMatchObject({
      threadId: 1,
      threadTitle: "Best side quest?",
      gameTitle: "The Witcher 3: Wild Hunt",
      count: 3,
    });
  });

  it("starts a fresh count once the last one has been read", async () => {
    const { app, state } = buildTestApp({ seed: seed() });
    await post(app, USER_B, { body: doc("One") });
    await post(app, USER_B, { body: doc("Two") });

    const [note] = activity(state);
    await request(app)
      .patch(`/api/v1/me/notifications/${note!.id}`)
      .set("Authorization", authHeader(USER_A))
      .send({ read: true });
    await post(app, USER_C, { body: doc("Three") });

    expect(activity(state)).toHaveLength(1);
    expect(activity(state)[0]).toMatchObject({
      read_at: null,
      data: { count: 1 },
    });
  });

  it("is not raised for the author's own messages", async () => {
    const { app, state } = buildTestApp({ seed: seed() });

    await post(app, USER_A, { body: doc("Bump") });

    expect(activity(state)).toHaveLength(0);
  });

  it("does not double up on a reply that already told the author", async () => {
    const { app, state } = buildTestApp({
      seed: {
        ...seed(),
        communityMessages: [
          ...seed().communityMessages,
          buildMessage({ id: 3, author_id: USER_A, created_at: LONG_AGO }),
        ],
      },
    });

    await post(app, USER_B, { body: doc("To you"), parentId: 3 });

    expect(activity(state)).toHaveLength(0);
    expect(
      state.notifications.filter(
        (n) => n.kind === "community_reply" && n.user_id === USER_A,
      ),
    ).toHaveLength(1);
  });

  it("goes with the thread", async () => {
    const { app, state } = buildTestApp({
      seed: {
        ...seed(),
        profiles: [
          ...seed().profiles,
          buildProfile({
            id: "55555555-5555-5555-5555-555555555555",
            username: "admin",
            is_admin: true,
          }),
        ],
      },
    });
    await post(app, USER_B, { body: doc("One") });
    await post(app, USER_C, { body: doc("Two"), parentId: 2 });

    await request(app)
      .delete("/api/v1/community/threads/1")
      .set("Authorization", authHeader("55555555-5555-5555-5555-555555555555"));

    expect(
      state.notifications.filter((n) => n.kind.startsWith("community_")),
    ).toHaveLength(0);
  });
});

describe("thread search", () => {
  const searchSeed = () => {
    const base = seed();
    return {
      ...base,
      games: [
        ...base.games,
        buildGame({ id: 2, slug: "hollow-knight", title: "Hollow Knight" }),
      ],
      communityThreads: [
        ...base.communityThreads,
        buildThread({ id: 2, game_id: 2, title: "Hardest boss?" }),
        buildThread({ id: 3, title: "Soundtrack appreciation" }),
      ],
      communityMessages: [
        ...base.communityMessages,
        buildMessage({ id: 10, thread_id: 3, body: doc("The Radiance theme") }),
        buildMessage({
          id: 11,
          thread_id: 3,
          body: null,
          deleted_at: LONG_AGO,
        }),
      ],
    };
  };

  const search = (app: Express, q: string) =>
    request(app)
      .get("/api/v1/community/threads")
      .query({ q })
      .then((r) => r.body.data.map((t: { id: number }) => t.id).sort());

  it("finds a thread by its title, its game or a message in it", async () => {
    const { app } = buildTestApp({ seed: searchSeed() });

    expect(await search(app, "hardest")).toEqual([2]);
    expect(await search(app, "hollow kn")).toEqual([2]);
    expect(await search(app, "radiance")).toEqual([3]);
  });

  it("narrows with the other filters rather than replacing them", async () => {
    const { app } = buildTestApp({ seed: searchSeed() });

    const response = await request(app)
      .get("/api/v1/community/threads")
      .query({ q: "hollow", gameId: 1 });

    expect(response.body.data).toEqual([]);
  });
});

describe("picture cleanup", () => {
  it("deletes a picture an edit took out, and keeps the rest", async () => {
    const { app, state } = buildTestApp({
      seed: {
        ...seed(),
        communityMessages: [
          ...seed().communityMessages,
          buildMessage({
            id: 3,
            author_id: USER_B,
            body: {
              type: "doc",
              content: [
                { type: "image", attrs: { src: IMAGE(USER_B, 1) } },
                { type: "image", attrs: { src: IMAGE(USER_B, 2) } },
              ],
            },
          }),
        ],
      },
    });
    for (const n of [1, 2]) {
      state.communityImages.set(IMAGE(USER_B, n), {
        bytes: Buffer.from("x"),
        createdAt: LONG_AGO,
      });
    }

    await request(app)
      .patch("/api/v1/community/messages/3")
      .set("Authorization", authHeader(USER_B))
      .send({ body: picture(IMAGE(USER_B, 2)) });

    expect([...state.communityImages.keys()]).toEqual([IMAGE(USER_B, 2)]);
  });

  it("deletes a deleted message's pictures", async () => {
    const { app, state } = buildTestApp({
      seed: {
        ...seed(),
        communityMessages: [
          ...seed().communityMessages,
          buildMessage({
            id: 3,
            author_id: USER_B,
            body: picture(IMAGE(USER_B, 1)),
          }),
        ],
      },
    });
    state.communityImages.set(IMAGE(USER_B, 1), {
      bytes: Buffer.from("x"),
      createdAt: LONG_AGO,
    });

    await request(app)
      .delete("/api/v1/community/messages/3")
      .set("Authorization", authHeader(USER_B));

    expect(state.communityImages.size).toBe(0);
  });

  it("sweeps a day-old upload that never made it into a message", async () => {
    const { app, state } = buildTestApp({
      seed: {
        ...seed(),
        communityMessages: [
          ...seed().communityMessages,
          buildMessage({
            id: 3,
            author_id: USER_B,
            body: picture(IMAGE(USER_B, 90)),
          }),
        ],
      },
    });
    const old = { bytes: Buffer.from("x"), createdAt: LONG_AGO };
    state.communityImages.set(IMAGE(USER_B, 90), old); // posted
    state.communityImages.set(IMAGE(USER_B, 91), old); // never posted
    state.communityImages.set(IMAGE(USER_B, 92), {
      ...old,
      createdAt: new Date().toISOString(), // still being written
    });
    state.communityImages.set(IMAGE(USER_A, 93), old); // someone else's

    const upload = await request(app)
      .post("/api/v1/community/images")
      .set("Authorization", authHeader(USER_B))
      .set("Content-Type", "image/webp")
      .send(
        Buffer.concat([
          Buffer.from("RIFF"),
          Buffer.from([0, 0, 0, 0]),
          Buffer.from("WEBPdata"),
        ]),
      );

    expect(upload.status).toBe(201);
    expect([...state.communityImages.keys()].sort()).toEqual(
      [
        IMAGE(USER_B, 90),
        IMAGE(USER_B, 92),
        IMAGE(USER_A, 93),
        upload.body.url,
      ].sort(),
    );
  });
});

describe("the community sidebar", () => {
  const RECENT = new Date(Date.now() - 60_000).toISOString();
  const sidebarSeed = () => {
    const base = seed();
    return {
      ...base,
      games: [
        ...base.games,
        buildGame({ id: 2, slug: "hades", title: "Hades" }),
        buildGame({
          id: 3,
          slug: "explicit",
          title: "Explicit",
          has_sexual_content: true,
        }),
      ],
      communityThreads: [
        ...base.communityThreads,
        buildThread({ id: 2, game_id: 2 }),
        buildThread({ id: 3, game_id: 3 }),
        buildThread({
          id: 4,
          subject_kind: "patch_notes",
          game_id: null,
          title: "PlayRates patch notes",
        }),
      ],
      communityMessages: [
        ...base.communityMessages,
        // Witcher: one recent (plus two from long ago that do not count)
        buildMessage({ id: 3, created_at: RECENT }),
        // Hades: two recent
        buildMessage({
          id: 4,
          thread_id: 2,
          is_opening: true,
          created_at: RECENT,
        }),
        buildMessage({
          id: 5,
          thread_id: 2,
          author_id: USER_B,
          body: doc("Zagreus!"),
          created_at: RECENT,
        }),
        buildMessage({
          id: 6,
          thread_id: 3,
          author_id: USER_B,
          created_at: RECENT,
        }),
        buildMessage({
          id: 7,
          thread_id: 4,
          author_id: USER_B,
          created_at: RECENT,
        }),
      ],
    };
  };

  it("lists the games with the most messages lately, leaving explicit games out", async () => {
    const { app } = buildTestApp({ seed: sidebarSeed() });

    const response = await request(app).get("/api/v1/community/games");

    expect(response.status).toBe(200);
    expect(
      response.body.map((g: { game: { id: number } }) => g.game.id),
    ).toEqual([2, 1]);
    expect(response.body[0]).toMatchObject({
      game: { title: "Hades" },
      recentMessageCount: 2,
    });
  });

  it("lists the newest replies, not openings, not patch notes", async () => {
    const { app } = buildTestApp({ seed: sidebarSeed() });

    const response = await request(app).get("/api/v1/community/latest?limit=5");

    const ids = response.body.map((r: { id: number }) => r.id);
    expect(ids).toContain(5);
    expect(ids).not.toContain(4); // an opening
    expect(ids).not.toContain(6); // an explicit game
    expect(ids).not.toContain(7); // patch notes
    expect(response.body.find((r: { id: number }) => r.id === 5)).toMatchObject(
      {
        threadId: 2,
        excerpt: "Zagreus!",
        author: { username: "frienduser" },
      },
    );
  });
});

describe("spoilers", () => {
  const spoiled = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "The ending: " },
          { type: "text", text: "you die", marks: [{ type: "spoiler" }] },
        ],
      },
    ],
  };

  it("keeps a spoiler out of the reply notification's quote", async () => {
    const { app, state } = buildTestApp({ seed: seed() });

    await post(app, USER_C, { body: spoiled, parentId: 2 });

    const [note] = state.notifications.filter(
      (n) => n.kind === "community_reply",
    );
    expect(note!.data.excerpt).toBe("The ending: [spoiler]");
  });

  it("keeps a spoiler out of the latest replies", async () => {
    const { app } = buildTestApp({ seed: seed() });
    await post(app, USER_C, { body: spoiled });

    const response = await request(app).get("/api/v1/community/latest");

    expect(response.body[0].excerpt).toBe("The ending: [spoiler]");
  });

  it("shows the spoiler in the thread itself, for the reader to uncover", async () => {
    const { app } = buildTestApp({ seed: seed() });
    const reply = await post(app, USER_C, { body: spoiled });

    const thread = await request(app).get("/api/v1/community/threads/1");
    const message = thread.body.messages.find(
      (m: { id: number }) => m.id === reply.body.id,
    );

    expect(message.body.content[0].content[1].marks).toEqual([
      { type: "spoiler" },
    ]);
  });
});

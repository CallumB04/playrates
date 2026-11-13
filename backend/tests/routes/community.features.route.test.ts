import { describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { realWebp } from "../helpers/webp.js";
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
  buildNotification,
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

describe("who hears about a new message", () => {
  const USER_D = "66666666-6666-4666-8666-666666666666";
  const replies = (state: ReturnType<typeof buildTestApp>["state"]) =>
    state.notifications
      .filter((n) => n.kind === "community_reply")
      .map((n) => ({
        to: n.user_id,
        from: n.actor_id,
        reason: n.data.reason,
        messageId: n.data.messageId,
      }));
  const withD = () => ({
    ...seed(),
    profiles: [
      ...seed().profiles,
      buildProfile({ id: USER_D, username: "fourthuser" }),
    ],
  });

  it("tells the thread's author about any message in their thread", async () => {
    const { app, state } = buildTestApp({ seed: seed() });

    const reply = await post(app, USER_C, { body: doc("Great question") });

    expect(replies(state)).toEqual([
      {
        to: USER_A,
        from: USER_C,
        reason: "thread",
        messageId: reply.body.id,
      },
    ]);
  });

  it("tells the author of the message that was answered, and the thread's", async () => {
    const { app, state } = buildTestApp({ seed: seed() });

    const reply = await post(app, USER_C, {
      body: doc("Hard disagree, and here is why."),
      parentId: 2,
    });

    expect(replies(state)).toEqual([
      { to: USER_B, from: USER_C, reason: "reply", messageId: reply.body.id },
      { to: USER_A, from: USER_C, reason: "thread", messageId: reply.body.id },
    ]);
    expect(
      state.notifications.find((n) => n.user_id === USER_B)!.data,
    ).toMatchObject({
      threadId: 1,
      threadTitle: "Best side quest?",
      excerpt: "Hard disagree, and here is why.",
    });
  });

  /* A opens the thread and B answers it (2). A answers B, then C answers
     A in the same conversation: B hears of both, being part of it. D then
     answers the thread itself, and only A hears of that. */
  it("tells everyone in a conversation, and no one outside it", async () => {
    const { app, state } = buildTestApp({ seed: withD() });

    const mine = await post(app, USER_A, { body: doc("Why?"), parentId: 2 });
    expect(replies(state)).toEqual([
      { to: USER_B, from: USER_A, reason: "reply", messageId: mine.body.id },
    ]);

    const jims = await post(app, USER_C, {
      body: doc("Because"),
      parentId: mine.body.id,
    });
    expect(replies(state).filter((r) => r.messageId === jims.body.id)).toEqual([
      { to: USER_A, from: USER_C, reason: "reply", messageId: jims.body.id },
      {
        to: USER_B,
        from: USER_C,
        reason: "conversation",
        messageId: jims.body.id,
      },
    ]);

    const gregs = await post(app, USER_D, { body: doc("Something else") });
    expect(replies(state).filter((r) => r.messageId === gregs.body.id)).toEqual(
      [
        {
          to: USER_A,
          from: USER_D,
          reason: "thread",
          messageId: gregs.body.id,
        },
      ],
    );
  });

  it("tells each person once, for the closest reason", async () => {
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

    expect(replies(state)).toEqual([
      {
        to: USER_A,
        from: USER_B,
        reason: "reply",
        messageId: expect.any(Number),
      },
    ]);
  });

  it("tells no one of their own message", async () => {
    const { app, state } = buildTestApp({ seed: seed() });

    await post(app, USER_B, { body: doc("Also,"), parentId: 2 });
    await post(app, USER_A, { body: doc("Bump") });

    expect(replies(state).map((r) => [r.to, r.from])).toEqual([
      [USER_A, USER_B],
    ]);
  });

  it("goes when the reply is deleted", async () => {
    const { app, state } = buildTestApp({ seed: seed() });
    const reply = await post(app, USER_C, { body: doc("Oops"), parentId: 2 });

    await request(app)
      .delete(`/api/v1/community/messages/${reply.body.id}`)
      .set("Authorization", authHeader(USER_C));

    expect(replies(state)).toHaveLength(0);
  });

  it("reads back as a notification with the replier and why", async () => {
    const { app } = buildTestApp({ seed: seed() });
    await post(app, USER_C, { body: doc("Hello"), parentId: 2 });

    const inbox = await request(app)
      .get("/api/v1/me/notifications")
      .set("Authorization", authHeader(USER_A));

    expect(inbox.body.data[0]).toMatchObject({
      kind: "community_reply",
      reason: "thread",
      actor: { username: "thirduser" },
      threadTitle: "Best side quest?",
    });
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

  it("leaves someone else's picture alone when a message holding it goes", async () => {
    // A message from before uploads were tied to their author can still
    // show another member's picture.
    const { app, state } = buildTestApp({
      seed: {
        ...seed(),
        communityMessages: [
          ...seed().communityMessages,
          buildMessage({
            id: 3,
            author_id: USER_B,
            body: picture(IMAGE(USER_C, 1)),
          }),
        ],
      },
    });
    state.communityImages.set(IMAGE(USER_C, 1), {
      bytes: Buffer.from("x"),
      createdAt: LONG_AGO,
    });

    await request(app)
      .delete("/api/v1/community/messages/3")
      .set("Authorization", authHeader(USER_B));

    expect([...state.communityImages.keys()]).toEqual([IMAGE(USER_C, 1)]);
  });

  it("refuses an edit that adds someone else's picture", async () => {
    const { app, state } = buildTestApp({
      seed: {
        ...seed(),
        communityMessages: [
          ...seed().communityMessages,
          buildMessage({ id: 3, author_id: USER_B }),
        ],
      },
    });
    state.communityImages.set(IMAGE(USER_C, 1), {
      bytes: Buffer.from("x"),
      createdAt: LONG_AGO,
    });

    const response = await request(app)
      .patch("/api/v1/community/messages/3")
      .set("Authorization", authHeader(USER_B))
      .send({ body: picture(IMAGE(USER_C, 1)) });

    expect(response.status).toBe(422);
    expect(state.communityImages.has(IMAGE(USER_C, 1))).toBe(true);
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
      .send(await realWebp());

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

    const notes = state.notifications.filter(
      (n) => n.kind === "community_reply",
    );
    expect(notes.length).toBeGreaterThan(0);
    for (const note of notes) {
      expect(note.data.excerpt).toBe("The ending: [spoiler]");
    }
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

describe("a notification about an adult game", () => {
  /** Thread 1 is about an adult game; C, who has chosen to see them,
   *  answers A's thread. */
  const adultSeed = (optedIn: boolean) => {
    const base = seed();
    return {
      ...base,
      games: [buildGame({ id: 1, has_sexual_content: true })],
      communityThreads: [buildThread({ title: "Secret plans" })],
      profiles: base.profiles.map((p) =>
        p.id === USER_C
          ? { ...p, show_sexual_content: true }
          : p.id === USER_A
            ? { ...p, show_sexual_content: optedIn }
            : p,
      ),
    };
  };
  const bell = async (app: Express) =>
    (
      await request(app)
        .get("/api/v1/me/notifications")
        .set("Authorization", authHeader(USER_A))
    ).body.data.filter((n: { kind: string }) => n.kind === "community_reply");

  it("stays in the bell, with nothing of the thread, for someone who hasn't chosen them", async () => {
    const { app, email } = buildTestApp({ seed: adultSeed(false) });
    await post(app, USER_C, { body: doc("A spicy answer") });
    await email.flush();

    const [reply] = await bell(app);
    expect(reply).toMatchObject({
      hidden: true,
      threadTitle: "a thread about an adult game",
      excerpt: "",
    });
    expect(JSON.stringify(reply)).not.toContain("Secret plans");
    expect(email.sent).toHaveLength(0);
  });

  it("is whole, and emailed, for someone who has", async () => {
    const { app, email } = buildTestApp({ seed: adultSeed(true) });
    await post(app, USER_C, { body: doc("A spicy answer") });
    await email.flush();

    const [reply] = await bell(app);
    expect(reply.hidden).toBeUndefined();
    expect(reply.threadTitle).toBe("Secret plans");
    expect(reply.excerpt).toBe("A spicy answer");
    expect(email.sent.length).toBeGreaterThan(0);
  });

  it("is found by the thread's game, so older ones are hidden too", async () => {
    const { app } = buildTestApp({
      seed: {
        ...adultSeed(false),
        notifications: [
          buildNotification({
            kind: "review_upvote_milestone",
            dedupe_key: "review_upvotes:9",
            data: {
              reviewId: 9,
              gameId: 1,
              gameTitle: "Adult game",
              coverUrl: "https://example.test/cover.jpg",
              milestone: 5,
            },
          }),
        ],
      },
    });
    const response = await request(app)
      .get("/api/v1/me/notifications")
      .set("Authorization", authHeader(USER_A));
    expect(response.body.data[0]).toMatchObject({
      kind: "review_upvote_milestone",
      hidden: true,
      gameTitle: "an adult game",
      coverUrl: null,
      milestone: 5,
    });
  });
});

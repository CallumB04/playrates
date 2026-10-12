import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { AVATAR_MAX_BYTES, AVATAR_PIXELS, isWebp } from "@playrates/shared";
import { realJpeg, realWebp, webpWithPayload } from "../helpers/webp.js";
import {
  authHeader,
  buildTestApp,
  USER_A,
  USER_B,
} from "../helpers/buildTestApp.js";
import {
  baseSeed,
  buildFriendship,
  buildGameLog,
  buildProfile,
  buildReview,
} from "../helpers/fixtures.js";

describe("profiles", () => {
  it("updates the caller's own bio", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .patch("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A))
      .send({ bio: "Updated bio" });

    expect(response.status).toBe(200);
    expect(response.body.bio).toBe("Updated bio");
  });

  /**
   * The most important test in this file: an unexpected key in the body must
   * be rejected outright, never written.
   */
  it("rejects unknown fields instead of writing them", async () => {
    const { app, state } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .patch("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A))
      .send({ bio: "hi", id: "99999999-9999-9999-9999-999999999999" });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("validation_failed");
    // and nothing was written
    expect(state.profiles[0]!.id).toBe(USER_A);
    expect(state.profiles[0]!.bio).toBe("");
  });

  it("rejects a bio over the length limit", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .patch("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A))
      .send({ bio: "x".repeat(161) });

    expect(response.status).toBe(422);
    expect(response.body.error.details).toHaveProperty("bio");
  });

  it("returns 409 when the requested username is taken", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .patch("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A))
      .send({ username: "frienduser" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("username_taken");
  });

  it("allows a user to keep their own username", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .patch("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A))
      .send({ username: "devuser" });

    expect(response.status).toBe(200);
  });

  it("looks a profile up by username without authentication", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app).get("/api/v1/profiles/devuser");

    expect(response.status).toBe(200);
    expect(response.body.username).toBe("devuser");
  });

  it("returns 404 for an unknown username", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app).get("/api/v1/profiles/nobody");

    expect(response.status).toBe(404);
  });

  it("reports username availability", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const taken = await request(app).get(
      "/api/v1/profiles/check-username?username=devuser",
    );
    const free = await request(app).get(
      "/api/v1/profiles/check-username?username=brandnew",
    );

    expect(taken.body).toEqual({ available: false });
    expect(free.body).toEqual({ available: true });
  });
});

describe("finding people", () => {
  /* A profile page is already public, so requiring a session to find one only
     meant the masthead could not offer people to a signed-out visitor. */
  it("lets a signed-out visitor look someone up", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app).get("/api/v1/profiles?search=friend");

    expect(response.status).toBe(200);
    expect(
      response.body.data.map((p: { username: string }) => p.username),
    ).toEqual(["frienduser"]);
  });

  /* Settings, not profile data. A profile page is public; what the owner has
     chosen about adult content, their time zone and hiding their presence is
     not part of it. */
  const SETTINGS = ["showSexualContent", "timezone", "hideOnline"];

  it("keeps a viewer's settings out of a public profile", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const byName = await request(app).get("/api/v1/profiles/devuser");
    const bySearch = await request(app).get("/api/v1/profiles?search=devuser");

    expect(byName.status).toBe(200);
    for (const field of SETTINGS) {
      expect(byName.body, field).not.toHaveProperty(field);
      expect(bySearch.body.data[0], field).not.toHaveProperty(field);
    }
    // Still the profile, just without the settings behind it.
    expect(byName.body.username).toBe("devuser");
  });

  it("gives them back to the owner", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .get("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A));

    expect(response.status).toBe(200);
    for (const field of SETTINGS) {
      expect(response.body, field).toHaveProperty(field);
    }
  });

  /* Looking a name up, not handing out the directory. */
  it("refuses to list everyone", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    expect((await request(app).get("/api/v1/profiles")).status).toBe(422);
    expect((await request(app).get("/api/v1/profiles?search=a")).status).toBe(
      422,
    );
  });
});

describe("closing an account", () => {
  const seedWithEverything = () => ({
    ...baseSeed(),
    gameLogs: [buildGameLog({ id: 1, user_id: USER_A, game_id: 1 })],
    reviews: [buildReview({ id: 1, user_id: USER_A, game_id: 1 })],
    friendships: [
      buildFriendship({ user_a_id: USER_A, user_b_id: USER_B }),
    ],
  });

  it("takes the logs, reviews and friendships with it", async () => {
    const { app, state } = buildTestApp({ seed: seedWithEverything() });

    const response = await request(app)
      .delete("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A));

    expect(response.status).toBe(204);
    expect(state.profiles.find((p) => p.id === USER_A)).toBeUndefined();
    expect(state.gameLogs).toHaveLength(0);
    expect(state.reviews).toHaveLength(0);
    expect(state.friendships).toHaveLength(0);
  });

  it("clears what the logs held about them, and their picture", async () => {
    const event = (id: number, actor: string) => ({
      id,
      actor_id: actor,
      kind: "review_posted",
      game_id: 1,
      subject_id: "1",
      data: { excerpt: "what they wrote" },
      created_at: "2026-01-01T00:00:00.000Z",
    });
    const { app, state } = buildTestApp({
      seed: {
        ...seedWithEverything(),
        profiles: baseSeed().profiles.map((p) =>
          p.id === USER_A ? { ...p, avatar_url: "https://x.test/a.webp" } : p,
        ),
        activityEvents: [event(1, USER_A), event(2, USER_B)],
        gameEvents: [
          {
            id: 1,
            kind: "search",
            game_id: null,
            source: "search",
            actor_id: USER_A,
            data: { term: "zelda" },
            created_at: "2026-01-01T00:00:00.000Z",
          },
        ],
        serverErrors: [
          {
            id: 1,
            status: 500,
            code: "internal",
            method: "GET",
            path: "/x",
            message: "boom",
            request_id: null,
            user_id: USER_A,
            stack: null,
            created_at: "2026-01-01T00:00:00.000Z",
          },
        ],
      },
    });
    state.avatars.set(USER_A, Buffer.from("x"));

    await request(app)
      .delete("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A));

    expect(state.activityEvents.map((e) => e.actor_id)).toEqual([USER_B]);
    expect(state.gameEvents[0]!.actor_id).toBeNull();
    expect(state.serverErrors[0]!.user_id).toBeNull();
    expect(state.avatars.has(USER_A)).toBe(false);
  });

  it("leaves everyone else alone", async () => {
    const { app, state } = buildTestApp({ seed: seedWithEverything() });

    await request(app)
      .delete("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A));

    expect(state.profiles.find((p) => p.id === USER_B)).toBeDefined();
  });

  it("requires authentication", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });
    expect((await request(app).delete("/api/v1/profiles/me")).status).toBe(401);
  });

  it("404s when the profile is already gone", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .delete("/api/v1/profiles/me")
      .set("Authorization", authHeader("00000000-0000-0000-0000-00000000dead"));

    expect(response.status).toBe(404);
  });
});

describe("profile colour", () => {
  it("saves a chosen colour", async () => {
    const { app, state } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .patch("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A))
      .send({ accent: "jade" });

    expect(response.status).toBe(200);
    expect(response.body.accent).toBe("jade");
    expect(state.profiles.find((p) => p.id === USER_A)?.accent).toBe("jade");
  });

  /* Null used to mean "derive one from the username". There is no deriving
     any more, so it is not a colour and not an answer. */
  it("refuses null, which is no longer a colour", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .patch("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A))
      .send({ accent: null });

    expect(response.status).toBe(422);
  });

  it("replaces one choice with another", async () => {
    const { app, state } = buildTestApp({ seed: baseSeed() });
    await request(app)
      .patch("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A))
      .send({ accent: "jade" });

    const response = await request(app)
      .patch("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A))
      .send({ accent: "crimson" });

    expect(response.body.accent).toBe("crimson");
    expect(state.profiles.find((p) => p.id === USER_A)?.accent).toBe(
      "crimson",
    );
  });

  it("refuses a colour that is not one of ours", async () => {
    const { app, state } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .patch("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A))
      .send({ accent: "chartreuse" });

    expect(response.status).toBe(422);
    expect(state.profiles.find((p) => p.id === USER_A)?.accent).toBe(
      "indigo",
    );
  });

  it("shows the colour on the public profile too, so everyone sees it", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });
    await request(app)
      .patch("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A))
      .send({ accent: "ember" });

    const response = await request(app).get("/api/v1/profiles/devuser");

    expect(response.body.accent).toBe("ember");
  });
});

describe("profile picture", () => {
  let webp: Buffer;
  beforeAll(async () => {
    webp = await realWebp();
  });

  const upload = (app: Parameters<typeof request>[0], body: Buffer) =>
    request(app)
      .post("/api/v1/profiles/me/avatar")
      .set("Authorization", authHeader(USER_A))
      .set("Content-Type", "image/webp")
      .send(body);

  it("stores the image and puts its URL on the profile", async () => {
    const { app, state } = buildTestApp({ seed: baseSeed() });

    const response = await upload(app, webp);

    expect(response.status).toBe(200);
    expect(response.body.avatarUrl).toContain(`avatars/${USER_A}/avatar.webp`);
    expect(isWebp(state.avatars.get(USER_A)!)).toBe(true);
    expect(
      state.profiles.find((p) => p.id === USER_A)?.avatar_url,
    ).toBe(response.body.avatarUrl);
  });

  it("takes a JPEG from a browser that cannot encode WebP, and stores WebP", async () => {
    const { app, state } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .post("/api/v1/profiles/me/avatar")
      .set("Authorization", authHeader(USER_A))
      .set("Content-Type", "image/jpeg")
      .send(await realJpeg());

    expect(response.status).toBe(200);
    expect(isWebp(state.avatars.get(USER_A)!)).toBe(true);
  });

  /* The browser compresses before uploading, so anything that is not already
     a WebP or JPEG reached this endpoint some other way. */
  it("refuses a body that is not a WebP or JPEG", async () => {
    const { app, state } = buildTestApp({ seed: baseSeed() });

    const response = await upload(app, Buffer.from("\x89PNG\r\n\x1a\n and more"));

    expect(response.status).toBe(400);
    expect(state.avatars.has(USER_A)).toBe(false);
  });

  it("refuses an empty body", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await upload(app, Buffer.alloc(0));

    expect(response.status).toBe(400);
  });

  it("stores only the pixels, not anything riding after them", async () => {
    const { app, state } = buildTestApp({ seed: baseSeed() });

    const response = await upload(
      app,
      await webpWithPayload("<script>alert(1)</script>"),
    );

    expect(response.status).toBe(200);
    expect(state.avatars.get(USER_A)!.includes("<script>")).toBe(false);
  });

  it("refuses a WebP header with no picture behind it", async () => {
    const { app, state } = buildTestApp({ seed: baseSeed() });

    const response = await upload(app, webp.subarray(0, 20));

    expect(response.status).toBe(400);
    expect(state.avatars.has(USER_A)).toBe(false);
  });

  it("refuses a picture larger than the uploader ever sends", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await upload(app, await realWebp(AVATAR_PIXELS + 1));

    expect(response.status).toBe(400);
  });

  it("refuses a body over the byte cap", async () => {
    const { app, state } = buildTestApp({ seed: baseSeed() });

    const response = await upload(
      app,
      Buffer.concat([webp, Buffer.alloc(AVATAR_MAX_BYTES)]),
    );

    expect(response.status).toBe(413);
    expect(state.avatars.has(USER_A)).toBe(false);
  });

  /* A different content type never reaches the raw parser, so the body
     arrives empty rather than as bytes to be trusted. */
  it("refuses a body sent as something other than a WebP", async () => {
    const { app, state } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .post("/api/v1/profiles/me/avatar")
      .set("Authorization", authHeader(USER_A))
      .set("Content-Type", "application/octet-stream")
      .send(webp);

    expect(response.status).toBe(400);
    expect(state.avatars.has(USER_A)).toBe(false);
  });

  it("requires authentication", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .post("/api/v1/profiles/me/avatar")
      .set("Content-Type", "image/webp")
      .send(webp);

    expect(response.status).toBe(401);
  });

  it("clears the picture, and takes it out of storage with it", async () => {
    const { app, state } = buildTestApp({ seed: baseSeed() });
    await upload(app, webp);

    const response = await request(app)
      .delete("/api/v1/profiles/me/avatar")
      .set("Authorization", authHeader(USER_A));

    expect(response.status).toBe(200);
    expect(response.body.avatarUrl).toBeNull();
    expect(state.avatars.has(USER_A)).toBe(false);
  });

  /* The upload endpoint is the only way to get a picture, so the general
     profile update must not be a second door onto avatar_url. */
  it("will not take an avatarUrl through the profile update", async () => {
    const { app, state } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .patch("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A))
      .send({ avatarUrl: "https://example.com/somebody-elses.png" });

    expect(response.status).toBe(422);
    expect(state.profiles.find((p) => p.id === USER_A)?.avatar_url).toBeNull();
  });
});

describe("the first-login welcome", () => {
  const newAccount = () => ({
    ...baseSeed(),
    profiles: [
      buildProfile({ onboarded_at: null }),
      buildProfile({ id: USER_B, username: "frienduser" }),
    ],
  });

  it("is still owed to an account that has not dismissed it", async () => {
    const { app } = buildTestApp({ seed: newAccount() });

    const response = await request(app)
      .get("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A));

    expect(response.body.onboardedAt).toBeNull();
  });

  it("is marked as seen once dismissed", async () => {
    const { app, state } = buildTestApp({ seed: newAccount() });

    const response = await request(app)
      .post("/api/v1/profiles/me/onboarded")
      .set("Authorization", authHeader(USER_A));

    expect(response.status).toBe(200);
    expect(response.body.onboardedAt).not.toBeNull();
    expect(state.profiles[0]!.onboarded_at).not.toBeNull();
  });

  /* Two tabs can each have the welcome open; closing the second must not
     move the date the first one set. */
  it("keeps the first time it was seen", async () => {
    const { app, state } = buildTestApp({ seed: newAccount() });
    const dismiss = () =>
      request(app)
        .post("/api/v1/profiles/me/onboarded")
        .set("Authorization", authHeader(USER_A));

    const first = (await dismiss()).body.onboardedAt;
    await new Promise((r) => setTimeout(r, 5));
    const second = (await dismiss()).body.onboardedAt;

    expect(second).toBe(first);
    expect(state.profiles[0]!.onboarded_at).toBe(first);
  });

  it("is owed to nobody who was here before it existed", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .get("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A));

    expect(response.body.onboardedAt).not.toBeNull();
  });

  it("requires a signed-in caller", async () => {
    const { app } = buildTestApp({ seed: newAccount() });

    const response = await request(app).post("/api/v1/profiles/me/onboarded");

    expect(response.status).toBe(401);
  });
});

describe("exporting an account", () => {
  const seed = () => ({
    ...baseSeed(),
    gameLogs: [
      buildGameLog({ id: 1, user_id: USER_A, game_id: 1 }),
      buildGameLog({ id: 2, user_id: USER_B, game_id: 1 }),
    ],
    reviews: [buildReview({ id: 1, user_id: USER_A, game_id: 1 })],
  });

  it("hands over the caller's own rows as a download", async () => {
    const { app } = buildTestApp({ seed: seed() });

    const response = await request(app)
      .get("/api/v1/profiles/me/export")
      .set("Authorization", authHeader(USER_A));

    expect(response.status).toBe(200);
    expect(response.headers["content-disposition"]).toMatch(
      /^attachment; filename="playrates-devuser-\d{4}-\d{2}-\d{2}\.json"$/,
    );
    expect(response.body.email).toBe(`${USER_A}@example.test`);
    expect(response.body.profile.username).toBe("devuser");
    expect(response.body.gameLogs.map((l: { id: number }) => l.id)).toEqual([1]);
    expect(response.body.reviews).toHaveLength(1);
  });

  it("requires authentication", async () => {
    const { app } = buildTestApp({ seed: seed() });

    expect((await request(app).get("/api/v1/profiles/me/export")).status).toBe(
      401,
    );
  });
});

describe("hiding from search engines", () => {
  it("is off by default, and the owner can switch it on", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const before = await request(app).get("/api/v1/profiles/devuser");
    await request(app)
      .patch("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A))
      .send({ hideFromSearch: true });
    const after = await request(app).get("/api/v1/profiles/devuser");

    expect(before.body.hideFromSearch).toBe(false);
    expect(after.body.hideFromSearch).toBe(true);
  });
});

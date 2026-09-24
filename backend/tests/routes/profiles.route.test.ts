import { describe, expect, it } from "vitest";
import request from "supertest";
import { AVATAR_MAX_BYTES } from "@playrates/shared";
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

  /* Null is a choice, not an omission: it puts the username's colour back. */
  it("takes null, and means it", async () => {
    const { app, state } = buildTestApp({ seed: baseSeed() });
    await request(app)
      .patch("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A))
      .send({ accent: "jade" });

    const response = await request(app)
      .patch("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A))
      .send({ accent: null });

    expect(response.body.accent).toBeNull();
    expect(state.profiles.find((p) => p.id === USER_A)?.accent).toBeNull();
  });

  it("refuses a colour that is not one of ours", async () => {
    const { app, state } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .patch("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A))
      .send({ accent: "chartreuse" });

    expect(response.status).toBe(422);
    expect(state.profiles.find((p) => p.id === USER_A)?.accent).toBeNull();
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
  /* The smallest thing that passes the magic-byte check: "RIFF" + a size +
     "WEBP". The service does not decode it, and nor should it. */
  const webp = (body = "payload") =>
    Buffer.concat([
      Buffer.from("RIFF"),
      Buffer.from([0, 0, 0, 0]),
      Buffer.from("WEBP"),
      Buffer.from(body),
    ]);

  const upload = (app: Parameters<typeof request>[0], body: Buffer) =>
    request(app)
      .post("/api/v1/profiles/me/avatar")
      .set("Authorization", authHeader(USER_A))
      .set("Content-Type", "image/webp")
      .send(body);

  it("stores the image and puts its URL on the profile", async () => {
    const { app, state } = buildTestApp({ seed: baseSeed() });

    const response = await upload(app, webp());

    expect(response.status).toBe(200);
    expect(response.body.avatarUrl).toContain(`avatars/${USER_A}/avatar.webp`);
    expect(state.avatars.get(USER_A)).toEqual(webp());
    expect(
      state.profiles.find((p) => p.id === USER_A)?.avatar_url,
    ).toBe(response.body.avatarUrl);
  });

  /* The browser compresses before uploading, so anything that is not already
     a WebP reached this endpoint some other way. */
  it("refuses a body that is not a WebP", async () => {
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

  it("refuses a body over the byte cap", async () => {
    const { app, state } = buildTestApp({ seed: baseSeed() });

    const response = await upload(app, webp("x".repeat(AVATAR_MAX_BYTES)));

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
      .send(webp());

    expect(response.status).toBe(400);
    expect(state.avatars.has(USER_A)).toBe(false);
  });

  it("requires authentication", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .post("/api/v1/profiles/me/avatar")
      .set("Content-Type", "image/webp")
      .send(webp());

    expect(response.status).toBe(401);
  });

  it("clears the picture, and takes it out of storage with it", async () => {
    const { app, state } = buildTestApp({ seed: baseSeed() });
    await upload(app, webp());

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

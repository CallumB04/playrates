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
  buildFriendship,
  buildProfile,
  buildReview,
  buildGameLog,
} from "../helpers/fixtures.js";

const STRANGER = "33333333-3333-3333-3333-333333333333";

const seed = (friends = false) => ({
  ...baseSeed(),
  profiles: [
    buildProfile({
      first_name: "Dev",
      pronouns: "they/them",
      discord: "devuser",
      location: "Leeds",
      about_visibility: { discord: "friends", location: "private" },
    }),
    buildProfile({ id: USER_B, username: "frienduser" }),
    buildProfile({ id: STRANGER, username: "stranger" }),
  ],
  friendships: friends ? [buildFriendship({ status: "accepted" })] : [],
});

const aboutAs = async (viewer: string | null, friends = false) => {
  const { app } = buildTestApp({ seed: seed(friends) });
  const req = request(app).get("/api/v1/profiles/devuser");
  const response = viewer
    ? await req.set("Authorization", authHeader(viewer))
    : await req;
  return response.body.about;
};

describe("a profile's About fields, by who is looking", () => {
  it("shows a stranger only what is public, and never the first name by default", async () => {
    expect(await aboutAs(null)).toEqual({ pronouns: "they/them" });
    expect(await aboutAs(STRANGER)).toEqual({ pronouns: "they/them" });
  });

  it("shows a friend the fields kept to friends too", async () => {
    expect(await aboutAs(USER_B, true)).toEqual({
      pronouns: "they/them",
      discord: "devuser",
    });
  });

  it("does not take a pending request for a friendship", async () => {
    const { app } = buildTestApp({
      seed: { ...seed(), friendships: [buildFriendship()] },
    });
    const response = await request(app)
      .get("/api/v1/profiles/devuser")
      .set("Authorization", authHeader(USER_B));
    expect(response.body.about).toEqual({ pronouns: "they/them" });
  });

  it("shows the owner everything, with each field's visibility", async () => {
    const { app } = buildTestApp({ seed: seed() });
    const response = await request(app)
      .get("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A));

    expect(response.body.about).toEqual({
      firstName: "Dev",
      pronouns: "they/them",
      discord: "devuser",
      location: "Leeds",
    });
    expect(response.body.aboutVisibility).toMatchObject({
      firstName: "private",
      discord: "friends",
      location: "private",
      website: "everyone",
    });
  });

  it("keeps a first name out of the profile and off its reviews", async () => {
    const { app } = buildTestApp({
      seed: {
        ...seed(),
        gameLogs: [buildGameLog()],
        reviews: [buildReview()],
      },
    });
    const profile = await request(app).get("/api/v1/profiles/devuser");
    const reviews = await request(app).get("/api/v1/games/1/reviews");

    expect(profile.body).not.toHaveProperty("firstName");
    expect(JSON.stringify(reviews.body)).not.toContain('"Dev"');
  });
});

describe("saving the About fields", () => {
  const patch = (body: object) => {
    const { app } = buildTestApp({ seed: baseSeed() });
    return request(app)
      .patch("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A))
      .send(body);
  };

  it("saves them, a Steam name as the profile's address", async () => {
    const response = await patch({
      pronouns: "she/her",
      location: "Bristol",
      website: "https://example.com/me",
      discord: "dev.user",
      steam: "gaben",
    });

    expect(response.status).toBe(200);
    expect(response.body.about).toEqual({
      pronouns: "she/her",
      location: "Bristol",
      website: "https://example.com/me",
      discord: "dev.user",
      steam: "https://steamcommunity.com/id/gaben",
    });
  });

  it("clears a field given nothing", async () => {
    const { app } = buildTestApp({
      seed: { ...baseSeed(), profiles: [buildProfile({ pronouns: "he/him" })] },
    });
    const response = await request(app)
      .patch("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A))
      .send({ pronouns: "" });
    expect(response.body.about).toEqual({});
  });

  it("refuses a link that isn't a web address, and a Steam one that isn't Steam's", async () => {
    for (const body of [
      { website: "javascript:alert(1)" },
      { website: "ftp://example.com" },
      { steam: "https://example.com/id/gaben" },
      { discord: "not a name!" },
      { pronouns: "x".repeat(31) },
    ]) {
      expect((await patch(body)).status, JSON.stringify(body)).toBe(422);
    }
  });

  it("changes the visibility of the fields named, and keeps the rest", async () => {
    const { app } = buildTestApp({
      seed: {
        ...baseSeed(),
        profiles: [buildProfile({ about_visibility: { discord: "friends" } })],
      },
    });
    const response = await request(app)
      .patch("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A))
      .send({ aboutVisibility: { firstName: "everyone" } });

    expect(response.body.aboutVisibility).toMatchObject({
      firstName: "everyone",
      discord: "friends",
    });
  });
});

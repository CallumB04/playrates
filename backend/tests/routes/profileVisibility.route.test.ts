import { describe, expect, it } from "vitest";
import request from "supertest";
import type { ProfileVisibility } from "@playrates/shared";
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
} from "../helpers/fixtures.js";

const STRANGER = "33333333-3333-3333-3333-333333333333";

/** devuser (USER_A) owns the profile; frienduser (USER_B) is who is asking. */
const seed = (
  visibility: ProfileVisibility,
  friendship: "accepted" | "pending" | null = null,
) => {
  const base = baseSeed();
  return {
    ...base,
    profiles: [
      buildProfile({ profile_visibility: visibility }),
      base.profiles[1]!,
      buildProfile({ id: STRANGER, username: "stranger" }),
    ],
    friendships: friendship ? [buildFriendship({ status: friendship })] : [],
    gameLogs: [buildGameLog({ id: 1, user_id: USER_A })],
  };
};

/* Everything on a profile past its card. */
const ROUTES = [
  "/api/v1/users/devuser/shelf",
  "/api/v1/users/devuser/game-logs",
  "/api/v1/users/devuser/logs?gameId=1",
  "/api/v1/users/devuser/stats",
  "/api/v1/users/devuser/reviews",
  "/api/v1/users/devuser/friends",
  "/api/v1/users/devuser/community-threads",
  "/api/v1/community/threads?participant=devuser",
];

const all = (status: number) => ROUTES.map(() => status);

const statuses = async (
  visibility: ProfileVisibility,
  viewer: string | null,
  friendship: "accepted" | "pending" | null = null,
) => {
  const { app } = buildTestApp({ seed: seed(visibility, friendship) });
  return Promise.all(
    ROUTES.map(async (route) => {
      const req = request(app).get(route);
      const response = viewer
        ? await req.set("Authorization", authHeader(viewer))
        : await req;
      return response.status;
    }),
  );
};

describe("who can see past a profile's card", () => {
  it("shows everything to anyone, signed in or not, by default", async () => {
    expect(await statuses("everyone", null)).toEqual(all(200));
  });

  it("shows a friends-only profile to an accepted friend", async () => {
    expect(await statuses("friends", USER_B, "accepted")).toEqual(all(200));
  });

  /* A request is not a friendship: sending one must not unlock the shelf. */
  it("hides a friends-only profile from a pending friend, a stranger and a visitor", async () => {
    expect(await statuses("friends", USER_B, "pending")).toEqual(all(403));
    expect(await statuses("friends", STRANGER)).toEqual(all(403));
    expect(await statuses("friends", null)).toEqual(all(403));
  });

  it("hides a private profile even from friends", async () => {
    expect(await statuses("private", USER_B, "accepted")).toEqual(all(403));
  });

  it("always shows the owner their own profile", async () => {
    expect(await statuses("private", USER_A)).toEqual(all(200));
  });

  it("says why, so the page can tell private from broken", async () => {
    const { app } = buildTestApp({ seed: seed("private") });
    const response = await request(app).get("/api/v1/users/devuser/shelf");
    expect(response.body.error.code).toBe("profile_private");
  });

  it("still finds no one for a username that does not exist", async () => {
    const { app } = buildTestApp({ seed: seed("private") });
    const response = await request(app).get("/api/v1/users/nobody/shelf");
    expect(response.status).toBe(404);
  });

  /* The card itself is how a visitor learns the rest is private. */
  it("still shows the profile card", async () => {
    const { app } = buildTestApp({ seed: seed("private") });
    const response = await request(app).get("/api/v1/profiles/devuser");
    expect(response.status).toBe(200);
    expect(response.body.profileVisibility).toBe("private");
  });
});

describe("the friends activity feed", () => {
  const feed = async (visibility: ProfileVisibility) => {
    const { app } = buildTestApp({ seed: seed(visibility, "accepted") });
    const response = await request(app)
      .get("/api/v1/me/friends/activity")
      .set("Authorization", authHeader(USER_B));
    expect(response.status).toBe(200);
    return response.body.data.length;
  };

  it("keeps a friends-only friend's logs", async () => {
    expect(await feed("friends")).toBe(1);
  });

  it("leaves out a friend whose profile is only theirs", async () => {
    expect(await feed("private")).toBe(0);
  });
});

describe("choosing who can see your profile", () => {
  it("saves the choice and shows it on the profile", async () => {
    const { app } = buildTestApp({ seed: seed("everyone") });

    const saved = await request(app)
      .patch("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A))
      .send({ profileVisibility: "friends" });
    expect(saved.status).toBe(200);

    const profile = await request(app).get("/api/v1/profiles/devuser");
    expect(profile.body.profileVisibility).toBe("friends");
  });

  it("refuses a choice that is not one", async () => {
    const { app } = buildTestApp({ seed: seed("everyone") });
    const response = await request(app)
      .patch("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A))
      .send({ profileVisibility: "secret" });
    expect(response.status).toBe(422);
  });
});

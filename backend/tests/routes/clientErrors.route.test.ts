import { describe, expect, it } from "vitest";
import request from "supertest";
import { authHeader, buildTestApp, USER_A } from "../helpers/buildTestApp.js";
import { baseSeed, buildProfile } from "../helpers/fixtures.js";

const ADMIN = "33333333-3333-3333-3333-333333333333";

const seed = () => {
  const base = baseSeed();
  return {
    ...base,
    profiles: [
      ...base.profiles,
      buildProfile({ id: ADMIN, username: "admin", is_admin: true }),
    ],
  };
};

const crash = {
  message: "Cannot read properties of undefined (reading 'title')",
  stack: "TypeError: Cannot read properties of undefined\n    at GamePage",
  path: "/game/12?invite=abc#reviews",
  build: "40eefa2",
};

describe("browser errors", () => {
  it("records one sent signed out, keeping the path and not the query", async () => {
    const { app, state } = buildTestApp({ seed: seed() });

    const response = await request(app)
      .post("/api/v1/client-errors")
      .set("User-Agent", "Mozilla/5.0 (iPhone)")
      .send(crash);

    expect(response.status).toBe(204);
    expect(state.clientErrors).toMatchObject([
      {
        message: crash.message,
        stack: crash.stack,
        path: "/game/12",
        build: "40eefa2",
        user_agent: "Mozilla/5.0 (iPhone)",
        user_id: null,
      },
    ]);
  });

  it("says whose it was when they are signed in", async () => {
    const { app, state } = buildTestApp({ seed: seed() });

    await request(app)
      .post("/api/v1/client-errors")
      .set("Authorization", authHeader(USER_A))
      .send(crash);

    expect(state.clientErrors[0]!.user_id).toBe(USER_A);
  });

  it("cuts a long message down rather than refusing it", async () => {
    const { app, state } = buildTestApp({ seed: seed() });

    const response = await request(app)
      .post("/api/v1/client-errors")
      .send({ message: "x".repeat(5_000), path: "/" });

    expect(response.status).toBe(204);
    expect(state.clientErrors[0]!.message).toHaveLength(1_000);
    expect(state.clientErrors[0]!.stack).toBeNull();
  });

  it("refuses a report with no message", async () => {
    const { app, state } = buildTestApp({ seed: seed() });

    const response = await request(app)
      .post("/api/v1/client-errors")
      .send({ message: "  ", path: "/" });

    expect(response.status).toBe(422);
    expect(state.clientErrors).toHaveLength(0);
  });

  it("lists them for the admin, newest first, with the username", async () => {
    const { app } = buildTestApp({ seed: seed() });
    await request(app)
      .post("/api/v1/client-errors")
      .set("Authorization", authHeader(USER_A))
      .send({ ...crash, message: "first" });
    await request(app)
      .post("/api/v1/client-errors")
      .send({ ...crash, message: "second" });

    const response = await request(app)
      .get("/api/v1/admin/client-errors?limit=1")
      .set("Authorization", authHeader(ADMIN));

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject([
      { message: "second", username: null, path: "/game/12" },
    ]);
    const older = await request(app)
      .get(`/api/v1/admin/client-errors?before=${response.body.nextBefore}`)
      .set("Authorization", authHeader(ADMIN));
    expect(older.body.data).toMatchObject([
      { message: "first", username: "devuser" },
    ]);
    expect(older.body.nextBefore).toBeNull();
  });
});

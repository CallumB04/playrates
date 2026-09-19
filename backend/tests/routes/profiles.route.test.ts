import { describe, expect, it } from "vitest";
import request from "supertest";
import { authHeader, buildTestApp, USER_A } from "../helpers/buildTestApp.js";
import { baseSeed } from "../helpers/fixtures.js";

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
   * The regression test that matters most in this file. The old handler did
   * `{ ...user, ...req.body }`, so any extra key in the body was written
   * straight onto the stored record.
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

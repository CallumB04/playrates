import { describe, expect, it } from "vitest";
import request from "supertest";
import { authHeader, buildTestApp, USER_A } from "../helpers/buildTestApp.js";
import { baseSeed } from "../helpers/fixtures.js";

describe("request ids", () => {
  it("keeps a caller's id that looks like one", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .get("/health")
      .set("x-request-id", "abc-123_DEF");

    expect(response.headers["x-request-id"]).toBe("abc-123_DEF");
  });

  it("replaces one that is too long or has anything else in it", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    for (const given of ["x".repeat(65), "<script>", "a b"]) {
      const response = await request(app)
        .get("/health")
        .set("x-request-id", given);
      expect(response.headers["x-request-id"]).not.toBe(given);
      expect(response.headers["x-request-id"]).toMatch(/^[\w-]{36}$/);
    }
  });
});

describe("write ceiling", () => {
  it("refuses writes past sixty a minute, and leaves reads alone", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });
    const heartbeat = () =>
      request(app)
        .post("/api/v1/profiles/me/heartbeat")
        .set("Authorization", authHeader(USER_A));

    for (let i = 0; i < 60; i++) {
      expect((await heartbeat()).status).toBe(204);
    }

    expect((await heartbeat()).status).toBe(429);
    const read = await request(app)
      .get("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A));
    expect(read.status).toBe(200);
  });
});

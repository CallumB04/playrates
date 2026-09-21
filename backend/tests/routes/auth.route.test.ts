import { describe, expect, it } from "vitest";
import request from "supertest";
import { authHeader, buildTestApp, USER_A } from "../helpers/buildTestApp.js";
import { baseSeed } from "../helpers/fixtures.js";

describe("authentication", () => {
  it("rejects an unauthenticated request to a protected route", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app).get("/api/v1/profiles/me");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("unauthorized");
  });

  it("rejects a malformed authorization header", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .get("/api/v1/profiles/me")
      .set("Authorization", "NotBearer abc");

    expect(response.status).toBe(401);
  });

  it("rejects a token the verifier does not accept", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .get("/api/v1/profiles/me")
      .set("Authorization", "Bearer not-a-valid-token");

    expect(response.status).toBe(401);
  });

  it("resolves the caller from the token, not from the request", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .get("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A));

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(USER_A);
    expect(response.body.username).toBe("devuser");
  });

  it("never returns a password field", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .get("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A));

    expect(response.body).not.toHaveProperty("password");
    expect(response.body).not.toHaveProperty("email");
  });

  it("includes a request id on every error response", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app).get("/api/v1/profiles/me");

    expect(response.body.error.requestId).toBeTruthy();
    expect(response.headers["x-request-id"]).toBeTruthy();
  });

  it("returns the standard error envelope for an unknown endpoint", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app).get("/api/v1/nope");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("not_found");
  });
});

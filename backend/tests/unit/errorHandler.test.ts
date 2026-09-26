import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import {
  createErrorHandler,
  errorHandler,
} from "../../src/middleware/errorHandler.js";
import { AppError } from "../../src/lib/AppError.js";

const runHandler = async (error: unknown, handler = errorHandler) => {
  const json = vi.fn();
  // Typed params, or the mock's call tuple is [] and calls[0][0] won't index.
  const status = vi.fn((_code: number) => ({ json }));
  const req = {
    id: "req-1",
    path: "/test",
    method: "GET",
    originalUrl: "/test?x=1",
    log: undefined,
  } as unknown as Request;
  const res = { status } as unknown as Response;

  await handler(error, req, res, vi.fn());

  return {
    status: status.mock.calls[0]?.[0],
    body: json.mock.calls[0]?.[0] as {
      error: {
        code: string;
        message: string;
        details?: unknown;
        requestId: string;
      };
    },
  };
};

describe("error handler", () => {
  it("passes an AppError through with its status and code", async () => {
    const { status, body } = await runHandler(
      AppError.conflict("username_taken", "That username is taken"),
    );

    expect(status).toBe(409);
    expect(body.error.code).toBe("username_taken");
    expect(body.error.message).toBe("That username is taken");
  });

  it("includes validation details on a 422", async () => {
    const { body } = await runHandler(
      AppError.validation("Request validation failed", {
        rating: ["must be a multiple of 0.25"],
      }),
    );

    expect(body.error.details).toEqual({
      rating: ["must be a multiple of 0.25"],
    });
  });

  it("maps a Postgres unique violation to 409", async () => {
    const { status, body } = await runHandler({ code: "23505" });

    expect(status).toBe(409);
    expect(body.error.code).toBe("already_exists");
  });

  it("maps a foreign key violation to 422", async () => {
    expect((await runHandler({ code: "23503" })).status).toBe(422);
  });

  it("maps a check constraint violation to 422", async () => {
    expect((await runHandler({ code: "23514" })).status).toBe(422);
  });

  it("maps a PostgREST no-rows result to 404", async () => {
    expect((await runHandler({ code: "PGRST116" })).status).toBe(404);
  });

  /** A 5xx must never leak internals to the client. */
  it("hides the message and details of an unexpected error", async () => {
    const { status, body } = await runHandler(
      new Error('duplicate key value violates constraint "profiles_pkey"'),
    );

    expect(status).toBe(500);
    expect(body.error.message).toBe("Internal server error");
    expect(body.error.message).not.toContain("profiles_pkey");
    expect(body.error.details).toBeUndefined();
  });

  it("always includes the request id", async () => {
    expect((await runHandler(AppError.notFound())).body.error.requestId).toBe("req-1");
  });

  it("records a 5xx with the original message, for the admin error feed", async () => {
    const sink = vi.fn(async () => undefined);
    await runHandler(new Error("connection reset"), createErrorHandler(sink));

    expect(sink).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 500,
        code: "internal_error",
        method: "GET",
        path: "/test?x=1",
        message: "connection reset",
        requestId: "req-1",
      }),
    );
  });

  it("does not record a client error", async () => {
    const sink = vi.fn(async () => undefined);
    await runHandler(AppError.notFound(), createErrorHandler(sink));

    expect(sink).not.toHaveBeenCalled();
  });
});

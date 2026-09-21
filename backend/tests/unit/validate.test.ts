import { describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validate } from "../../src/middleware/validate.js";
import { AppError } from "../../src/lib/AppError.js";

const run = (
  middleware: ReturnType<typeof validate>,
  req: Partial<Request>,
): { req: Request; error: unknown } => {
  const next = vi.fn() as unknown as NextFunction;
  const request = req as Request;
  middleware(request, {} as Response, next);
  return { req: request, error: vi.mocked(next).mock.calls[0]?.[0] };
};

describe("validate", () => {
  const shape = {
    body: z.object({ rating: z.number().min(0).max(10) }),
    query: z.object({ page: z.coerce.number().default(1) }),
    params: z.object({ gameId: z.coerce.number() }),
  };

  it("puts the parsed values on req.valid, coercions included", () => {
    const { req, error } = run(validate(shape), {
      body: { rating: 8.5 },
      query: { page: "3" },
      params: { gameId: "7" },
    });

    expect(error).toBeUndefined();
    expect(req.valid).toEqual({
      body: { rating: 8.5 },
      query: { page: 3 },
      params: { gameId: 7 },
    });
  });

  it("leaves a section undefined when no schema asked for it", () => {
    const { req } = run(validate({ params: shape.params }), {
      body: { anything: true },
      params: { gameId: "7" },
    });

    expect(req.valid?.body).toBeUndefined();
    expect(req.valid?.query).toBeUndefined();
  });

  it("turns a schema failure into a 422 with the offending field named", () => {
    const { error } = run(validate(shape), {
      body: { rating: 42 },
      query: {},
      params: { gameId: "7" },
    });

    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).status).toBe(422);
    expect((error as AppError).details).toHaveProperty("rating");
  });

  it("names the bad param when the failure is in the path", () => {
    const { error } = run(validate(shape), {
      body: { rating: 8 },
      query: {},
      params: { gameId: "not-a-number" },
    });

    expect((error as AppError).details).toHaveProperty("gameId");
  });

  it("passes a non-zod failure straight through rather than calling it a 422", () => {
    const boom = new Error("schema exploded");
    const exploding = {
      parse: () => {
        throw boom;
      },
    } as unknown as z.ZodTypeAny;

    const { error } = run(validate({ body: exploding }), { body: {} });

    expect(error).toBe(boom);
  });
});

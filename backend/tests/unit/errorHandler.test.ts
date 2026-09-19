import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { errorHandler } from "../../src/middleware/errorHandler.js";
import { AppError } from "../../src/lib/AppError.js";

const runHandler = (error: unknown) => {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const req = { id: "req-1", path: "/test", log: undefined } as unknown as Request;
    const res = { status } as unknown as Response;

    errorHandler(error, req, res, vi.fn());

    return {
        status: status.mock.calls[0]?.[0],
        body: json.mock.calls[0]?.[0] as {
            error: { code: string; message: string; details?: unknown };
        },
    };
};

describe("error handler", () => {
    it("passes an AppError through with its status and code", () => {
        const { status, body } = runHandler(
            AppError.conflict("username_taken", "That username is taken")
        );

        expect(status).toBe(409);
        expect(body.error.code).toBe("username_taken");
        expect(body.error.message).toBe("That username is taken");
    });

    it("includes validation details on a 422", () => {
        const { body } = runHandler(
            AppError.validation("Request validation failed", {
                rating: ["must be a multiple of 0.25"],
            })
        );

        expect(body.error.details).toEqual({
            rating: ["must be a multiple of 0.25"],
        });
    });

    it("maps a Postgres unique violation to 409", () => {
        const { status, body } = runHandler({ code: "23505" });

        expect(status).toBe(409);
        expect(body.error.code).toBe("already_exists");
    });

    it("maps a foreign key violation to 422", () => {
        expect(runHandler({ code: "23503" }).status).toBe(422);
    });

    it("maps a check constraint violation to 422", () => {
        expect(runHandler({ code: "23514" }).status).toBe(422);
    });

    it("maps a PostgREST no-rows result to 404", () => {
        expect(runHandler({ code: "PGRST116" }).status).toBe(404);
    });

    /** A 5xx must never leak internals to the client. */
    it("hides the message and details of an unexpected error", () => {
        const { status, body } = runHandler(
            new Error('duplicate key value violates constraint "profiles_pkey"')
        );

        expect(status).toBe(500);
        expect(body.error.message).toBe("Internal server error");
        expect(body.error.message).not.toContain("profiles_pkey");
        expect(body.error.details).toBeUndefined();
    });

    it("always includes the request id", () => {
        expect(runHandler(AppError.notFound()).body.error.requestId).toBe(
            "req-1"
        );
    });
});

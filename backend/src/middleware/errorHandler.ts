import type { ErrorRequestHandler, RequestHandler } from "express";
import { AppError } from "../lib/AppError.js";
import { noopErrorSink, type ErrorSink } from "../config/errorSink.js";

/** Postgres and PostgREST codes translated once, so no service has to
 *  hand-roll "is this a duplicate key?". */
const PG_ERROR_MAP: Record<string, () => AppError> = {
  "23505": () =>
    AppError.conflict("already_exists", "That resource already exists"),
  "23503": () => AppError.validation("A referenced resource does not exist"),
  "23514": () => AppError.validation("A value violates a data constraint"),
  // PostgREST: .single() matched no rows
  PGRST116: () => AppError.notFound(),
};

/** Anything that isn't already an AppError becomes one, so every response has
 *  the same shape. */
/* body-parser rejects a body before any route sees it, and says why in
   `type`. Without this they all came back as a flat 500. */
const BODY_ERROR_MAP: Record<string, () => AppError> = {
  "entity.too.large": () => AppError.tooLarge(),
  "entity.parse.failed": () => AppError.badRequest("Malformed request body"),
  "encoding.unsupported": () => AppError.badRequest("Unsupported encoding"),
};

const normalise = (error: unknown): AppError => {
  if (error instanceof AppError) return error;

  const type = (error as { type?: string } | null)?.type;
  const fromBody = type ? BODY_ERROR_MAP[type] : undefined;
  if (fromBody) return fromBody();

  const code = (error as { code?: string } | null)?.code;
  const mapped = code ? PG_ERROR_MAP[code] : undefined;
  if (mapped) return mapped();

  return AppError.internal();
};

/** What went wrong, in words. The database client rejects with plain
 *  objects, not Errors, and reading only `Error`s recorded every database
 *  failure as "Internal server error". */
export const describeError = (
  error: unknown,
): { message: string | null; stack: string | null } => {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack ?? null };
  }
  if (error && typeof error === "object") {
    const e = error as Record<string, unknown>;
    const parts = [e.code, e.message, e.details, e.hint].filter(
      (part): part is string => typeof part === "string" && part !== "",
    );
    return {
      message: parts.length > 0 ? parts.join(" · ") : null,
      stack: JSON.stringify(error, null, 2),
    };
  }
  return { message: typeof error === "string" ? error : null, stack: null };
};

export const createErrorHandler =
  (sink: ErrorSink = noopErrorSink): ErrorRequestHandler =>
  async (error, req, res, _next) => {
    const appError = normalise(error);
    const log = req.log;

    if (appError.status >= 500) {
      // log the original error, not the normalised one, so the stack survives
      log?.error({ err: error, requestId: req.id }, "unhandled error");
      /* Recorded before responding: on serverless the instance can be frozen
         the moment the response is sent, taking a pending write with it. */
      const described = describeError(error);
      await sink({
        status: appError.status,
        code: appError.code,
        method: req.method,
        path: req.originalUrl ?? req.path,
        message: described.message ?? appError.message,
        requestId: req.id ?? null,
        userId: req.auth?.userId ?? null,
        stack: described.stack,
      });
    } else {
      log?.warn(
        { code: appError.code, path: req.path, requestId: req.id },
        appError.message,
      );
    }

    res.status(appError.status).json({
      error: {
        code: appError.code,
        // a 5xx never leaks its message
        message: appError.expose ? appError.message : "Internal server error",
        ...(appError.expose && appError.details !== undefined
          ? { details: appError.details }
          : {}),
        requestId: req.id,
      },
    });
  };

export const errorHandler = createErrorHandler();

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(AppError.notFound("Endpoint"));
};

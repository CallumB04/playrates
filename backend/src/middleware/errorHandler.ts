import type { ErrorRequestHandler, RequestHandler } from "express";
import { AppError } from "../lib/AppError.js";

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

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const appError = normalise(error);
  const log = req.log;

  if (appError.status >= 500) {
    // log the original error, not the normalised one, so the stack survives
    log?.error({ err: error, requestId: req.id }, "unhandled error");
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

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(AppError.notFound("Endpoint"));
};

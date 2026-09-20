import type { ErrorRequestHandler, RequestHandler } from "express";
import { AppError } from "../lib/AppError.js";

/**
 * Postgres / PostgREST error codes translated once, here, so no service has to
 * hand-roll "is this a duplicate key?".
 */
const PG_ERROR_MAP: Record<string, () => AppError> = {
  "23505": () =>
    AppError.conflict("already_exists", "That resource already exists"),
  "23503": () => AppError.validation("A referenced resource does not exist"),
  "23514": () => AppError.validation("A value violates a data constraint"),
  // PostgREST: .single() matched no rows
  PGRST116: () => AppError.notFound(),
};

/** Anything that is not already an AppError becomes one, so the response
 *  shape is the same regardless of where the failure came from. */
const normalise = (error: unknown): AppError => {
  if (error instanceof AppError) return error;

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

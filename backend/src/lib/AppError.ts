export type ErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "validation_failed"
  | "rate_limited"
  | "upstream_error"
  | "internal_error"
  | "username_taken"
  | "already_exists"
  | "self_friend"
  | "not_configured";

/**
 * Every error the API returns deliberately, with the status and machine-
 * readable code baked in. `expose` is what keeps internals in: a 5xx logs
 * fully server-side but returns a generic message, so Postgres constraint
 * names and stack traces never reach a client.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details?: unknown;
  readonly expose: boolean;

  constructor(
    status: number,
    code: ErrorCode,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.expose = status < 500;
    Error.captureStackTrace?.(this, AppError);
  }

  static badRequest = (message: string, details?: unknown) =>
    new AppError(400, "bad_request", message, details);

  static unauthorized = (message = "Authentication required") =>
    new AppError(401, "unauthorized", message);

  static forbidden = (message = "You do not have access to this resource") =>
    new AppError(403, "forbidden", message);

  static notFound = (what = "Resource") =>
    new AppError(404, "not_found", `${what} not found`);

  static conflict = (code: ErrorCode, message: string, details?: unknown) =>
    new AppError(409, code, message, details);

  static validation = (message: string, details?: unknown) =>
    new AppError(422, "validation_failed", message, details);

  static rateLimited = (message = "Too many requests") =>
    new AppError(429, "rate_limited", message);

  static upstream = (message: string, details?: unknown) =>
    new AppError(502, "upstream_error", message, details);

  static notConfigured = (message: string) =>
    new AppError(503, "not_configured", message);

  static internal = (message = "Internal server error") =>
    new AppError(500, "internal_error", message);
}

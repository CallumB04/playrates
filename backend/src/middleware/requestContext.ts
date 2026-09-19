import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import type { Logger } from "../lib/logger.js";

/**
 * Attaches a request id and a child logger. The id is echoed in every error
 * response, so a user-reported failure maps to a log line with one grep.
 */
export const requestContext =
  (logger: Logger): RequestHandler =>
  (req, res, next) => {
    const id = req.header("x-request-id") ?? randomUUID();
    req.id = id;
    req.log = logger.child({ requestId: id });
    res.setHeader("x-request-id", id);
    next();
  };

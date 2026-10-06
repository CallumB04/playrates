import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import type { Logger } from "../lib/logger.js";

// A caller's id is kept only if it looks like one. It is echoed back and
// stored with any error, so anything longer or stranger is replaced.
const REQUEST_ID = /^[\w-]{1,64}$/;

/** Attaches a request id and a child logger. The id is echoed in every error
 *  response, so a reported failure maps to a log line. */
export const requestContext =
  (logger: Logger): RequestHandler =>
  (req, res, next) => {
    const given = req.header("x-request-id");
    const id = given && REQUEST_ID.test(given) ? given : randomUUID();
    req.id = id;
    req.log = logger.child({ requestId: id });
    res.setHeader("x-request-id", id);
    next();
  };

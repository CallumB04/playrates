import pino from "pino";
import { env } from "../config/env.js";

/** Errors are logged with their request id, so a report maps to a log line. */
export const createLogger = () =>
  pino({
    level: env().LOG_LEVEL,
    ...(env().NODE_ENV === "development"
      ? {
          transport: {
            target: "pino/file",
            options: { destination: 1 },
          },
        }
      : {}),
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "*.password",
        "*.access_token",
      ],
      remove: true,
    },
  });

export type Logger = ReturnType<typeof createLogger>;

import pino from "pino";
import { env } from "../config/env.js";

/**
 * The old server logged nothing at all — not even a listen message — and every
 * catch block discarded its error object, so failures in production were
 * undiagnosable.
 */
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
                'req.headers.authorization',
                'req.headers.cookie',
                "*.password",
                "*.access_token",
            ],
            remove: true,
        },
    });

export type Logger = ReturnType<typeof createLogger>;

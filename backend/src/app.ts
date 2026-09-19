import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { createLogger, type Logger } from "./lib/logger.js";
import { requestContext } from "./middleware/requestContext.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { makeRequireAuth, type Verifier } from "./middleware/requireAuth.js";
import { buildRoutes } from "./routes.js";
import type { Repositories } from "./repositories.js";
import type { GamesProvider } from "./providers/games/GamesProvider.js";

export interface AppDeps {
    repos: Repositories;
    provider: GamesProvider;
    /** Injected so tests can authenticate without signing real JWTs. */
    verify: Verifier;
    logger?: Logger;
}

/**
 * Builds the app but does not listen. Keeping those separate is what lets
 * supertest drive the real stack in-process.
 */
export const buildApp = ({
    repos,
    provider,
    verify,
    logger = createLogger(),
}: AppDeps): Express => {
    const app = express();

    app.disable("x-powered-by");
    app.use(helmet());
    app.use(
        cors({
            // an explicit allowlist; the old server used a bare cors() wildcard
            origin: env().CORS_ORIGINS,
            credentials: false,
        })
    );
    app.use(express.json({ limit: "64kb" }));
    app.use(requestContext(logger));

    app.get("/health", (_req, res) => {
        res.json({ status: "ok" });
    });

    app.use(
        "/api/v1",
        buildRoutes({
            repos,
            provider,
            requireAuth: makeRequireAuth(verify),
            optionalAuth: makeRequireAuth(verify, { optional: true }),
        })
    );

    app.use(notFoundHandler);
    // must be last: Express 5 forwards rejected promises here, which is why
    // no handler in this codebase needs its own try/catch
    app.use(errorHandler);

    return app;
};

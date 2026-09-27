import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { createLogger, type Logger } from "./lib/logger.js";
import { requestContext } from "./middleware/requestContext.js";
import { perMinute } from "./lib/rateLimit.js";
import { createErrorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { noopErrorSink, type ErrorSink } from "./config/errorSink.js";
import { makeRequireAuth, type Verifier } from "./middleware/requireAuth.js";
import { buildRoutes } from "./routes.js";
import type { Repositories } from "./repositories.js";
import type { AuthAdmin } from "./config/authAdmin.js";
import type { AvatarStore } from "./config/avatarStore.js";
import type { CommunityImageStore } from "./config/communityImageStore.js";
import type { GamesProvider } from "./providers/games/GamesProvider.js";
import { createPagesRouter } from "./modules/pages/pages.routes.js";
import { createPagesService } from "./modules/pages/pages.service.js";
import {
  createTemplateSource,
  type TemplateSource,
} from "./modules/pages/template.js";

export interface AppDeps {
  repos: Repositories;
  provider: GamesProvider;
  authAdmin: AuthAdmin;
  avatars: AvatarStore;
  communityImages: CommunityImageStore;
  /** Injected so tests can authenticate without signing real JWTs. */
  verify: Verifier;
  logger?: Logger;
  /** Where 5xx responses are recorded for the admin dashboard. */
  errorSink?: ErrorSink;
  /** The built index.html that rendered pages start from. */
  template?: TemplateSource;
  /** Whether this is the live site, which alone asks to be indexed. */
  production?: boolean;
}

/** Builds the app but does not listen, so supertest can drive it in-process. */
export const buildApp = ({
  repos,
  provider,
  authAdmin,
  avatars,
  communityImages,
  verify,
  logger = createLogger(),
  errorSink = noopErrorSink,
  template = createTemplateSource(),
  production = process.env.VERCEL_ENV === "production",
}: AppDeps): Express => {
  const app = express();

  app.disable("x-powered-by");
  // One hop: Vercel's edge sets x-forwarded-for itself. Without this every
  // visitor shares the proxy's address, and one rate limit between them.
  app.set("trust proxy", 1);

  app.use(requestContext(logger));

  // Pages before helmet: they wear the site's CSP, not the API's.
  app.use(
    createPagesRouter({
      service: createPagesService(repos),
      sitemap: repos.sitemap,
      template,
      logger,
      production,
    }),
  );
  app.use(helmet());
  app.use(
    cors({
      // explicit allowlist rather than a wildcard
      origin: env().CORS_ORIGINS,
      credentials: false,
    }),
  );
  app.use(express.json({ limit: "64kb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // A ceiling on writes of any kind. The routes that cost more carry
  // tighter ones of their own.
  const writeLimiter = perMinute(60);
  app.use("/api/v1", (req, res, next) =>
    req.method === "GET" || req.method === "HEAD"
      ? next()
      : writeLimiter(req, res, next),
  );

  app.use(
    "/api/v1",
    buildRoutes({
      repos,
      provider,
      authAdmin,
      avatars,
      communityImages,
      requireAuth: makeRequireAuth(verify),
      optionalAuth: makeRequireAuth(verify, { optional: true }),
    }),
  );

  app.use(notFoundHandler);
  // must be last: Express 5 forwards rejected promises here, so no handler
  // needs its own try/catch
  app.use(createErrorHandler(errorSink));

  return app;
};

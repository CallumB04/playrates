import { createServerApp } from "../backend/src/server.js";

/**
 * The whole API as one Vercel function.
 *
 * A catch-all rather than a file per route: the Express router already owns
 * the routing, and splitting it would give every endpoint its own cold start
 * and its own copy of the Supabase client.
 *
 * The module is evaluated once per warm instance, so the app is built once and
 * reused; only the request handling below runs per call.
 */
const { app } = createServerApp();

export default app;

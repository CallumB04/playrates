import { createServerApp } from "../backend/src/server.js";

/**
 * The whole API as one Vercel function. vercel.json rewrites every /api path
 * here, so the Express router keeps owning the routing — splitting it into a
 * file per route would give each endpoint its own cold start and its own copy
 * of the Supabase client.
 *
 * The module is evaluated once per warm instance, so the app is built once and
 * reused; only request handling runs per call.
 */
const { app } = createServerApp();

export default app;

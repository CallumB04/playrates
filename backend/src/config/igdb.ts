import type { SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "./env.js";
import {
  nullGamesProvider,
  type GamesProvider,
} from "../providers/games/GamesProvider.js";
import {
  createIgdbProvider,
  type IgdbRequestOutcome,
} from "../providers/games/igdb/igdb.provider.js";

/** Counts each IGDB request for the admin dashboard, live traffic and
 *  scripts alike. */
export const createIgdbUsageRecorder =
  (db: SupabaseClient) =>
  async ({ failed, error }: IgdbRequestOutcome): Promise<void> => {
    const { error: rpcError } = await db.rpc("bump_igdb_usage", {
      p_failed: failed,
      p_error: error,
    });
    if (rpcError) throw rpcError;
  };

/** IGDB when both Twitch credentials are set; the local catalogue alone
 *  otherwise. */
export const igdbFromEnv = (
  config: Pick<Env, "IGDB_CLIENT_ID" | "IGDB_CLIENT_SECRET">,
  db: SupabaseClient,
): GamesProvider =>
  config.IGDB_CLIENT_ID && config.IGDB_CLIENT_SECRET
    ? createIgdbProvider(config.IGDB_CLIENT_ID, config.IGDB_CLIENT_SECRET, fetch, {
        onRequest: createIgdbUsageRecorder(db),
      })
    : nullGamesProvider;

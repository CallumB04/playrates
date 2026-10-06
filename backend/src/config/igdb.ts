import type { SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "./env.js";
import {
  nullGamesProvider,
  type GamesProvider,
} from "../providers/games/GamesProvider.js";
import {
  createIgdbProvider,
  type IgdbProvider,
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

type IgdbCredentials = Pick<Env, "IGDB_CLIENT_ID" | "IGDB_CLIENT_SECRET">;

/** IGDB itself, or null without both Twitch credentials. */
export const igdbProviderFromEnv = (
  config: IgdbCredentials,
  db: SupabaseClient,
): IgdbProvider | null =>
  config.IGDB_CLIENT_ID && config.IGDB_CLIENT_SECRET
    ? createIgdbProvider(config.IGDB_CLIENT_ID, config.IGDB_CLIENT_SECRET, fetch, {
        onRequest: createIgdbUsageRecorder(db),
      })
    : null;

/** IGDB when both Twitch credentials are set; the local catalogue alone
 *  otherwise. */
export const igdbFromEnv = (
  config: IgdbCredentials,
  db: SupabaseClient,
): GamesProvider => igdbProviderFromEnv(config, db) ?? nullGamesProvider;

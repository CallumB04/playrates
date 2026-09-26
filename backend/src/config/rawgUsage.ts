import type { Db } from "./supabase.js";
import type { RawgRequestOutcome } from "../providers/games/rawg/rawg.provider.js";

/** Counts each RAWG call against the day, for the admin quota meter. */
export const createRawgUsageRecorder =
  (db: Db) =>
  async ({ failed, error }: RawgRequestOutcome): Promise<void> => {
    const { error: rpcError } = await db.rpc("bump_rawg_usage", {
      p_failed: failed,
      p_error: error,
    });
    if (rpcError) throw rpcError;
  };

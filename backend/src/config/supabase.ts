import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env.js";

/**
 * The service-role client. It bypasses RLS, which is why every table has RLS on
 * with no policies — this process should be the only thing reaching them.
 *
 * Never send this key to a browser or prefix it with VITE_.
 */
let client: SupabaseClient | undefined;

export const supabase = (): SupabaseClient => {
  client ??= createClient(env().SUPABASE_URL, env().SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      // a server has no session to persist or refresh
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return client;
};

export type Db = SupabaseClient;

import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

/**
 * Used for authentication only — sign up, sign in, sign out, and keeping the
 * session fresh.
 *
 * It is deliberately never used to query tables. All data goes through the
 * PlayRates API, which holds the service-role key and does its own
 * authorization. Every table has row level security on with no policies, so
 * this client could not read them even if something tried.
 */
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
    },
});

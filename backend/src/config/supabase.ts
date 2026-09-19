import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env.js";

/**
 * The service-role client. It bypasses row level security, which is exactly
 * why every table has RLS on with no policies: this process is the only thing
 * that should ever reach them, and all authorization happens in the service
 * layer above.
 *
 * This key must never be sent to a browser or prefixed with VITE_.
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

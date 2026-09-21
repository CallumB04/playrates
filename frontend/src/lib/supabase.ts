import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

/** Auth only. RLS means this client can't read tables anyway. */
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
    },
});

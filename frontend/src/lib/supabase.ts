import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

/** Auth only — sign up, sign in, sign out, session refresh. Never used to
 *  query tables; RLS means this client couldn't read them anyway. */
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
    },
});

import { AuthClient } from "@supabase/auth-js";
import { env } from "./env";

/* Auth only: RLS means the browser can't read tables anyway, so the rest of
   supabase-js (database, storage, realtime) was weight for nothing. Set up
   as supabase-js sets up its own, down to the storage key, so a session
   saved before the switch is still found. */
const authClient = new AuthClient({
    url: `${env.supabaseUrl}/auth/v1`,
    headers: {
        Authorization: `Bearer ${env.supabaseAnonKey}`,
        apikey: env.supabaseAnonKey,
    },
    storageKey: `sb-${new URL(env.supabaseUrl).hostname.split(".")[0]}-auth-token`,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "implicit",
});

export const supabase = { auth: authClient };

/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** Base URL of the PlayRates API, no trailing slash. */
    readonly VITE_API_BASE_URL?: string;
    readonly VITE_SUPABASE_URL: string;
    /**
     * Publishable key. Safe in the bundle: every table has row level security
     * enabled with no policies, so this key can reach nothing directly.
     */
    readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

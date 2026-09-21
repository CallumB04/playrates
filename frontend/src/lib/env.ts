/** Throws at import time rather than failing on the first request. */
const required = (name: string, value: string | undefined): string => {
    if (!value) {
        throw new Error(
            `Missing environment variable ${name}. ` +
                `Copy frontend/.env.example to frontend/.env and fill it in.`
        );
    }
    return value;
};

export const env = {
    apiBaseUrl: (
        import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000"
    ).replace(/\/+$/, ""),
    supabaseUrl: required(
        "VITE_SUPABASE_URL",
        import.meta.env.VITE_SUPABASE_URL
    ),
    supabaseAnonKey: required(
        "VITE_SUPABASE_ANON_KEY",
        import.meta.env.VITE_SUPABASE_ANON_KEY
    ),
} as const;

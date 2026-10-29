import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: ["tests/**/*.test.ts"],
        // integration tests need a running local Supabase, so they are opt-in
        exclude: ["tests/integration/**"],
        globals: false,

        /* Scoped to the code unit tests are meant to cover: pure helpers,
           mappers and middleware. Repositories and services are exercised
           through the route tests instead. */
        coverage: {
            provider: "v8",
            include: [
                "src/lib/**",
                "src/middleware/**",
                "src/modules/**/*.mapper.ts",
                "src/providers/games/GamesProvider.ts",
                "src/providers/games/igdb/igdb.mapper.ts",
                "src/providers/games/explicitContent.ts",
                "src/modules/email/email.tokens.ts",
                "src/modules/email/email.webhook.ts",
                "src/modules/email/email.templates.ts",
                "src/modules/email/email.richText.ts",
                "src/modules/email/email.events.ts",
                "src/modules/email/email.resend.ts",
                "src/modules/email/email.sender.ts",
                "src/modules/email/email.audience.ts",
            ],
            exclude: [
                "**/*.test.ts",
                // pretty-print transport, and a JWKS round trip
                "src/lib/logger.ts",
                "src/middleware/requireAuth.ts",
            ],
            thresholds: { statements: 95, branches: 90, functions: 95, lines: 95 },
        },
    },
});

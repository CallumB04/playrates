import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: ["tests/**/*.test.ts"],
        // integration tests need a running local Supabase, so they are opt-in
        exclude: ["tests/integration/**"],
        globals: false,
    },
});

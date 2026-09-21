/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    test: {
        environment: "jsdom",
        globals: false,
        setupFiles: ["./src/test/setup.ts"],
        include: ["src/**/*.test.{ts,tsx}"],
        css: false,

        /* Scoped to the code unit tests are meant to cover: pure helpers,
           reducers and hooks. Components are exercised through the route and
           behaviour tests instead, so folding them in would only move the
           number without saying anything. */
        coverage: {
            provider: "v8",
            include: [
                "src/lib/**",
                "src/hooks/**",
                "src/constants/gameStatus.ts",
                "src/pages/**/lib/**",
                "src/components/gamelog/logEditorReducer.ts",
                "src/components/ui/Figure.tsx",
                "src/components/ui/RatingBadge.tsx",
            ],
            exclude: [
                "**/*.test.{ts,tsx}",
                "src/lib/supabase.ts",
                "src/lib/env.ts",
                "src/lib/assets.ts",
                "src/hooks/queries/**",
            ],
            thresholds: { statements: 95, branches: 90, functions: 95, lines: 95 },
        },
    },
});

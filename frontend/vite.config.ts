import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
    // served from the domain root. This was "/PlayRates" for GitHub Pages,
    // which also hardcoded that prefix into every asset path in the app.
    base: "/",
    plugins: [react()],
    server: {
        host: true,
        port: 5173,
    },
});

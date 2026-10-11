import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/* One id per build. The commit on Vercel; the clock anywhere else, which is
   only ever a local build that nothing is comparing against. */
const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA ?? String(Date.now());

/** Publishes the id beside the app, so an open tab can ask whether the site
 *  has moved on without it. */
const versionFile = (): Plugin => ({
    name: "playrates-version-file",
    apply: "build",
    generateBundle() {
        this.emitFile({
            type: "asset",
            fileName: "version.json",
            source: JSON.stringify({ id: BUILD_ID }),
        });
    },
});

export default defineConfig({
    base: "/",
    plugins: [react(), tailwindcss(), versionFile()],
    define: {
        __BUILD_ID__: JSON.stringify(BUILD_ID),
    },
    server: {
        host: true,
        port: 5173,
    },
});

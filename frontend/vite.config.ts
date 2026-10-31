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
    build: {
        rolldownOptions: {
            output: {
                /* React and the router change least, so they get a chunk of
                   their own that stays cached across deploys. Everything
                   else splits as it falls: gathering what pages share into
                   bigger chunks made the first load heavier, as the entry
                   then pulled in code only other pages use. */
                codeSplitting: {
                    groups: [
                        {
                            name: "react",
                            test: /node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom|@remix-run)[\\/]/,
                            priority: 30,
                        },
                    ],
                },
            },
        },
    },
    server: {
        host: true,
        port: Number(process.env.PORT) || 5173,
    },
});

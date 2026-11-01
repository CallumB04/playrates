import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
// Fonts a member can set their name in. Declared only: each downloads the
// first time a name on screen uses it.
import "@fontsource/silkscreen/latin-400.css";
import "@fontsource/orbitron/latin-700.css";
import "@fontsource/cinzel/latin-700.css";
import "@fontsource/vt323/latin-400.css";
import "@fontsource/press-start-2p/latin-400.css";
import "@fontsource/bungee/latin-400.css";
import "@fontsource/permanent-marker/latin-400.css";
import "./styles/theme.css";
import App from "./App.tsx";
import { AppProviders } from "./app/AppProviders.tsx";
import { installErrorReporting } from "./lib/errorReporting.ts";
import { watchInstallOffer } from "./lib/installPrompt.ts";

installErrorReporting();
watchInstallOffer();
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {
            // Without it the site works as it always has: no offline page,
            // no pushes.
        });
    });
}

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <AppProviders>
            <App />
        </AppProviders>
    </StrictMode>
);

import { useSyncExternalStore } from "react";

/** Chrome's and Edge's offer to install, held until someone asks for it.
 *  Not a standard yet, so not in the DOM's types. */
interface InstallEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let offer: InstallEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

/** From startup: the offer comes once, early, whatever page is open. The
 *  browser's own install button is left alone. */
export const watchInstallOffer = (): void => {
    window.addEventListener("beforeinstallprompt", (event) => {
        offer = event as InstallEvent;
        emit();
    });
    window.addEventListener("appinstalled", () => {
        offer = null;
        emit();
    });
};

export const useInstallOffer = (): boolean =>
    useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        () => offer !== null
    );

/** Whether they said yes. The offer is spent either way. */
export const install = async (): Promise<boolean> => {
    const current = offer;
    if (!current) return false;
    await current.prompt();
    const { outcome } = await current.userChoice;
    offer = null;
    emit();
    return outcome === "accepted";
};

/** Running as the installed app rather than in a browser tab. */
export const isInstalled = (): boolean =>
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true;

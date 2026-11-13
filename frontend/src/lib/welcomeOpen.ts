import { useSyncExternalStore } from "react";

let open = false;
const listeners = new Set<() => void>();

/** Whether the welcome is on screen, so the corner's XP toasts can wait:
 *  on a phone they'd sit over its buttons. */
export const setWelcomeOpen = (value: boolean): void => {
    open = value;
    listeners.forEach((listener) => listener());
};

export const useWelcomeOpen = (): boolean =>
    useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        () => open,
        () => false
    );

import { useSyncExternalStore } from "react";
import type { SetupStepKey } from "@playrates/shared";

let current: SetupStepKey | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

/** Opens a setup step's sheet from anywhere: the journey on home, the
 *  account menu, the end of the welcome. One at a time. */
export const openSetupStep = (step: SetupStepKey): void => {
    current = step;
    emit();
};

export const closeSetupStep = (): void => {
    current = null;
    emit();
};

export const useSetupSheet = (): SetupStepKey | null =>
    useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        () => current,
        () => null
    );

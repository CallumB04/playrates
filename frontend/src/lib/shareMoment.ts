import { useSyncExternalStore } from "react";

/** Something worth sharing: a page on the site, and what to say about it.
 *  Whoever shows the sheet adds the picture and the invite. */
export interface ShareMoment {
    title: string;
    /** A path on the site, without the invite. */
    path: string;
    text: string;
    /** The moment's own picture; without one, the sharer's player card. */
    image?: string;
}

let current: ShareMoment | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

/** Opens the share sheet from anywhere: a toast's button, a popup. One at
 *  a time; a second replaces the first. */
export const shareMoment = (moment: ShareMoment): void => {
    current = moment;
    emit();
};

export const closeShareMoment = (): void => {
    current = null;
    emit();
};

export const useShareMoment = (): ShareMoment | null =>
    useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        () => current
    );

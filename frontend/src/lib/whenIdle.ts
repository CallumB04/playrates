/** Runs `task` once the browser has nothing better to do, or after a
 *  couple of seconds where it can't say. Returns a cancel, so an effect
 *  can hand it straight back as its cleanup. */
export const whenIdle = (task: () => void): (() => void) => {
    if (typeof window.requestIdleCallback === "function") {
        const id = window.requestIdleCallback(task, { timeout: 4000 });
        return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(task, 2000);
    return () => window.clearTimeout(id);
};

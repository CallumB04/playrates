import { sendClientError } from "../api/endpoints/reports";
import { BUILD_ID } from "./buildVersion";

/* Enough to see a crash and what led to it; a page throwing in a loop must
   not turn every visit into a stream of requests. */
const MAX_PER_PAGE_LOAD = 5;

/* Not ours to fix: a browser extension's code, a script from another origin
   the browser won't describe, a layout warning that is harmless, or an old
   tab asking for a chunk the deploy removed (the error boundary reloads it). */
const NOISE = [
    /^Script error\.?$/,
    /ResizeObserver loop/,
    /dynamically imported module|Importing a module script failed|error loading dynamically imported/i,
];
const FOREIGN_SOURCE = /(chrome|moz|safari(-web)?)-extension:\/\//;

export const isReportable = (message: string, stack?: string | null): boolean =>
    message.trim().length > 0 &&
    !NOISE.some((pattern) => pattern.test(message)) &&
    !FOREIGN_SOURCE.test(stack ?? "");

const summarise = (
    error: unknown
): { message: string; stack: string | null } => {
    if (error instanceof Error) {
        return {
            message: `${error.name}: ${error.message}`,
            stack: error.stack ?? null,
        };
    }
    return { message: String(error), stack: null };
};

let enabled = false;
let sent = 0;
const seen = new Set<string>();

/** Sends a crash to the admin's Health page. Quiet until installed, so tests
 *  and the component library never post anything. Never throws. */
export const reportError = (error: unknown): void => {
    if (!enabled || sent >= MAX_PER_PAGE_LOAD) return;
    const { message, stack } = summarise(error);
    if (!isReportable(message, stack) || seen.has(message)) return;
    seen.add(message);
    sent += 1;
    sendClientError({
        message,
        stack,
        path: window.location.pathname,
        build: BUILD_ID,
    }).catch(() => {
        // Nowhere left to report it to.
    });
};

export const installErrorReporting = (): void => {
    enabled = true;
    window.addEventListener("error", (event) =>
        reportError(event.error ?? event.message)
    );
    window.addEventListener("unhandledrejection", (event) =>
        reportError(event.reason)
    );
};

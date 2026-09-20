import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "../api";

/**
 * Retries are deliberately off for 4xx: a 404 will not become a 200, and
 * retrying it only delays the error state the UI wants to show.
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
                if (
                    error instanceof ApiError &&
                    error.status !== undefined &&
                    error.status < 500
                ) {
                    return false;
                }
                return failureCount < 2;
            },
        },
        mutations: { retry: 0 },
    },
});

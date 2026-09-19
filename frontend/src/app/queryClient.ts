import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "../api";

/**
 * The old client was `new QueryClient()` with no options, so every query
 * retried three times — including 404s, which turned a missing profile into
 * four requests and a long wait before the error screen appeared.
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

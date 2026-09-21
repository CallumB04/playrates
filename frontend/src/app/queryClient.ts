import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "../api";

/** No retries on 4xx — a 404 won't become a 200, so retrying just delays the
 *  error the UI wants to show. */
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

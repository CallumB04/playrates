import { MutationCache, QueryClient } from "@tanstack/react-query";
import { ApiError, queryKeys } from "../api";

/* Anything you do might earn XP, finish a quest or unlock a badge, so any
   change refreshes your progress, a beat later for the database to land. */
let pending: ReturnType<typeof setTimeout> | undefined;
const refreshProgress = () => {
    clearTimeout(pending);
    pending = setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.progress.me });
    }, 400);
};

/** No retries on 4xx — a 404 won't become a 200, so retrying just delays the
 *  error the UI wants to show. */
export const queryClient = new QueryClient({
    mutationCache: new MutationCache({
        onSuccess: (_data, _vars, _context, mutation) => {
            if (mutation.options.mutationKey?.[0] !== "progress") {
                refreshProgress();
            }
        },
    }),
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

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement, ReactNode } from "react";
import { NotificationProvider } from "../contexts/NotificationContext";
import { ThemeProvider } from "../contexts/ThemeContext";

/**
 * A fresh QueryClient per test, with retries off — otherwise a test asserting
 * an error state waits for the retry schedule before the error ever surfaces.
 */
export const createTestQueryClient = () =>
    new QueryClient({
        defaultOptions: {
            queries: { retry: false, gcTime: Infinity },
            mutations: { retry: false },
        },
    });

interface Options extends Omit<RenderOptions, "wrapper"> {
    route?: string;
    queryClient?: QueryClient;
}

export const renderWithProviders = (
    ui: ReactElement,
    {
        route = "/",
        queryClient = createTestQueryClient(),
        ...options
    }: Options = {}
) => {
    const Wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <NotificationProvider>
                    <MemoryRouter initialEntries={[route]}>
                        {children}
                    </MemoryRouter>
                </NotificationProvider>
            </ThemeProvider>
        </QueryClientProvider>
    );

    return { queryClient, ...render(ui, { wrapper: Wrapper, ...options }) };
};

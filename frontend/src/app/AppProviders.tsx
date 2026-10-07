import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { queryClient } from "./queryClient";
import { NotificationProvider } from "../contexts/NotificationContext";
import { AuthProvider } from "../contexts/AuthContext";
import { AccountFormProvider } from "../contexts/AccountFormContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import ErrorBoundary from "../components/feedback/ErrorBoundary";
import { LogFlowProvider } from "../components/gamelog/LogFlow";

/* Order matters. AuthProvider loads the profile through the query client and
   emits toasts, AccountFormProvider needs useLocation, and the log popups
   LogFlowProvider opens need all of them. */
export const AppProviders = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
        <ThemeProvider>
            <ErrorBoundary>
                <NotificationProvider>
                    <BrowserRouter>
                        <AuthProvider>
                            <AccountFormProvider>
                                <LogFlowProvider>{children}</LogFlowProvider>
                            </AccountFormProvider>
                        </AuthProvider>
                    </BrowserRouter>
                </NotificationProvider>
            </ErrorBoundary>
        </ThemeProvider>
    </QueryClientProvider>
);

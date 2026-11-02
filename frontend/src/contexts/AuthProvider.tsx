import type { Session } from "@supabase/auth-js";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { effectiveTimeZone, setDisplayTimeZone } from "../lib/format";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { MyProfile } from "@playrates/shared";
import { fetchMyProfile, queryKeys, sendHeartbeat } from "../api";
import { supabase } from "../lib/supabase";
import { CONFIRMED_PARAM } from "../lib/authLinks";
import { readAuthRedirectError } from "../lib/authRedirect";
import { useNotify } from "./NotificationContext";
import { AuthContext, type AuthContextValue } from "./AuthContext";

/** Where a confirmation link lands: home, saying it worked. */
const confirmedUrl = () => `${window.location.origin}/?${CONFIRMED_PARAM}=1`;
export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [isRestoring, setIsRestoring] = useState(true);
    const queryClient = useQueryClient();
    const notify = useNotify();
    const navigate = useNavigate();
    const navigateRef = useRef(navigate);
    navigateRef.current = navigate;

    // restore any existing session, then follow it
    useEffect(() => {
        let active = true;

        supabase.auth.getSession().then(({ data }) => {
            if (!active) return;
            setSession(data.session);
            setIsRestoring(false);

            const redirectError = readAuthRedirectError(window.location.href);
            if (redirectError) {
                window.history.replaceState(
                    window.history.state,
                    "",
                    redirectError.cleanUrl
                );
                notify(
                    redirectError.cancelled
                        ? "Sign-in cancelled"
                        : "Couldn’t sign you in. Please try again.",
                    redirectError.cancelled ? "info" : "error"
                );
            }
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, nextSession) => {
            setSession(nextSession);
            // A reset link signs you in to choose a new password, wherever
            // the link landed, so take you to where that's done.
            if (event === "PASSWORD_RECOVERY") {
                navigateRef.current("/reset-password");
            }
        });

        return () => {
            active = false;
            subscription.unsubscribe();
        };
    }, [notify]);

    /* The server marks you online for five minutes after the last beat, so
       beat well inside that window. The first one clears the profile caches,
       which still say offline. */
    useEffect(() => {
        if (!session) return;
        let active = true;

        const beat = (first = false) =>
            sendHeartbeat()
                .then(() => {
                    if (first && active) {
                        void queryClient.invalidateQueries({
                            queryKey: ["profiles"],
                        });
                    }
                })
                .catch(() => {
                    // Presence is decoration; a failed beat is not worth a toast.
                });

        void beat(true);
        const id = setInterval(() => void beat(), 2 * 60_000);
        return () => {
            active = false;
            clearInterval(id);
        };
    }, [session, queryClient]);

    const { data: user, isLoading: isProfileLoading } = useQuery<MyProfile>({
        queryKey: queryKeys.profiles.me,
        queryFn: fetchMyProfile,
        enabled: !!session,
        staleTime: 60_000,
    });

    /* Dates render in the profile's zone. Signed out falls back to the
       browser's, which is the honest guess for someone with no preference. */
    useEffect(() => {
        setDisplayTimeZone(effectiveTimeZone(user?.timezone));
    }, [user?.timezone]);

    const value = useMemo<AuthContextValue>(
        () => ({
            session,
            user: session ? (user ?? null) : null,
            isLoading: isRestoring || (!!session && isProfileLoading),

            async signUp(email, password, username, captchaToken, news) {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        // read by the handle_new_user trigger to seed the profile
                        data: { username, news: news === true },
                        captchaToken,
                        emailRedirectTo: confirmedUrl(),
                    },
                });
                if (error) throw error;
                // No session when the project wants the email confirmed first.
                return { signedIn: !!data.session };
            },

            async signInWithProvider(provider, returnTo) {
                const { error } = await supabase.auth.signInWithOAuth({
                    provider,
                    options: { redirectTo: returnTo ?? window.location.href },
                });
                if (error) throw error;
            },

            async confirmPassword(password, captchaToken) {
                const email = session?.user.email;
                if (!email) throw new Error("No email to sign in with");
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                    options: { captchaToken },
                });
                if (error) throw error;
            },

            async signIn(email, password, captchaToken) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                    options: { captchaToken },
                });
                if (error) throw error;
                notify("Welcome back", "success");
            },

            async resendConfirmation(email, captchaToken) {
                const { error } = await supabase.auth.resend({
                    type: "signup",
                    email,
                    options: { captchaToken, emailRedirectTo: confirmedUrl() },
                });
                if (error) throw error;
            },

            async requestPasswordReset(email, captchaToken) {
                const { error } = await supabase.auth.resetPasswordForEmail(
                    email,
                    {
                        redirectTo: `${window.location.origin}/reset-password`,
                        captchaToken,
                    }
                );
                if (error) throw error;
            },

            async updatePassword(password) {
                const { error } = await supabase.auth.updateUser({ password });
                if (error) throw error;
                notify("Password changed", "success");
            },

            async changeEmail(email) {
                const { data, error } = await supabase.auth.updateUser({
                    email,
                });
                if (error) throw error;
                return { pending: data.user.email !== email };
            },

            async changePassword(current, next, captchaToken) {
                const email = session?.user.email;
                if (!email) throw new Error("No email to sign in with");
                const { error: checkError } =
                    await supabase.auth.signInWithPassword({
                        email,
                        password: current,
                        options: { captchaToken },
                    });
                if (checkError) throw checkError;
                const { error } = await supabase.auth.updateUser({
                    password: next,
                });
                if (error) throw error;
            },

            async signOut() {
                /* This device only. Supabase's default signs out everywhere,
                   so leaving on a laptop logged the phone out too. */
                await supabase.auth.signOut({ scope: "local" });
                // drop every cached response so the next user starts clean
                queryClient.clear();
                notify("Logged out", "success");
            },
        }),
        [session, user, isRestoring, isProfileLoading, queryClient, notify]
    );

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
};

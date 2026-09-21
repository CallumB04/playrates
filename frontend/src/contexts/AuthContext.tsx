import type { Session } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { browserTimeZone, setDisplayTimeZone } from "../lib/format";
import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import type { Profile } from "@playrates/shared";
import { fetchMyProfile, queryKeys, sendHeartbeat } from "../api";
import { supabase } from "../lib/supabase";
import { useNotify } from "./NotificationContext";

interface AuthContextValue {
    session: Session | null;
    user: Profile | null;
    isLoading: boolean;
    signUp: (
        email: string,
        password: string,
        username: string
    ) => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [isRestoring, setIsRestoring] = useState(true);
    const queryClient = useQueryClient();
    const notify = useNotify();

    // restore any existing session, then follow it
    useEffect(() => {
        let active = true;

        supabase.auth.getSession().then(({ data }) => {
            if (!active) return;
            setSession(data.session);
            setIsRestoring(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            setSession(nextSession);
        });

        return () => {
            active = false;
            subscription.unsubscribe();
        };
    }, []);

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

    const { data: user, isLoading: isProfileLoading } = useQuery<Profile>({
        queryKey: queryKeys.profiles.me,
        queryFn: fetchMyProfile,
        enabled: !!session,
        staleTime: 60_000,
    });

    /* Dates render in the profile's zone. Signed out falls back to the
       browser's, which is the honest guess for someone with no preference. */
    useEffect(() => {
        setDisplayTimeZone(user?.timezone || browserTimeZone());
    }, [user?.timezone]);

    const value = useMemo<AuthContextValue>(
        () => ({
            session,
            user: session ? (user ?? null) : null,
            isLoading: isRestoring || (!!session && isProfileLoading),

            async signUp(email, password, username) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    // read by the handle_new_user trigger to seed the profile
                    options: { data: { username } },
                });
                if (error) throw error;
            },

            async signIn(email, password) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                notify("You are now logged in", "success");
            },

            async signOut() {
                await supabase.auth.signOut();
                // drop every cached response so the next user starts clean
                queryClient.clear();
                notify("You have been logged out", "success");
            },
        }),
        [session, user, isRestoring, isProfileLoading, queryClient, notify]
    );

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextValue => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

/** Kept so existing call sites reading the current user do not all churn. */
export const useUser = (): Profile | null => useAuth().user;

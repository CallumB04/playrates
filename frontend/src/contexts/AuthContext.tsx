import type { Session } from "@supabase/auth-js";
import { createContext, useContext } from "react";
import type { MyProfile } from "@playrates/shared";

export interface AuthContextValue {
    session: Session | null;
    user: MyProfile | null;
    isLoading: boolean;
    /* captchaToken: from useCaptcha, once Supabase is set to require one. */
    /** `news`: whether they ticked to get news emails. Off unless asked. */
    signUp: (
        email: string,
        password: string,
        username: string,
        captchaToken?: string,
        news?: boolean
    ) => Promise<{ signedIn: boolean }>;
    signIn: (
        email: string,
        password: string,
        captchaToken?: string
    ) => Promise<void>;
    /** Leaves for the provider's sign-in page and comes back here, or to
     *  `returnTo`. Signing in and signing up are the same thing this way. */
    signInWithProvider: (
        provider: OAuthProvider,
        returnTo?: string
    ) => Promise<void>;
    /** Signs in again with the password, quietly, for what wants a sign-in
     *  from moments ago. A wrong one throws `invalid_credentials`. */
    confirmPassword: (password: string, captchaToken?: string) => Promise<void>;
    signOut: () => Promise<void>;
    /** Sends the sign-up confirmation again, for an email not yet confirmed. */
    resendConfirmation: (email: string, captchaToken?: string) => Promise<void>;
    /** Emails a link to set a new password. Says nothing about whether the
     *  address has an account. */
    requestPasswordReset: (
        email: string,
        captchaToken?: string
    ) => Promise<void>;
    /** Sets a new password for whoever followed that link. */
    updatePassword: (password: string) => Promise<void>;
    /** Moves the account to a new address. `pending` while the project
     *  wants the change confirmed from the inbox first. */
    changeEmail: (email: string) => Promise<{ pending: boolean }>;
    /** Signs in with the current password before setting the new one, so a
     *  device left signed in can't be used to lock its owner out. A wrong
     *  current password throws the sign-in's `invalid_credentials`. */
    changePassword: (
        current: string,
        next: string,
        captchaToken?: string
    ) => Promise<void>;
}

export type OAuthProvider = "google" | "discord";

export const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = (): AuthContextValue => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

/** Kept so existing call sites reading the current user do not all churn. */
export const useUser = (): MyProfile | null => useAuth().user;

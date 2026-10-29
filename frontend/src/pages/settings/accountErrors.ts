import { isAuthError, type User } from "@supabase/supabase-js";

const PROVIDER_NAMES: Record<string, string> = {
    google: "Google",
    discord: "Discord",
};

/**
 * The provider an account signs in with when it has no password, or null
 * when it has one. Nothing to go on reads as having one: the form then
 * fails on the sign-in check and says so, rather than hiding the option.
 */
export const passwordlessProvider = (user?: User | null): string | null => {
    const providers = user?.app_metadata.providers ?? [];
    if (providers.length === 0 || providers.includes("email")) return null;
    const first = providers[0]!;
    return PROVIDER_NAMES[first] ?? first;
};

const RATE_LIMITED = new Set([
    "over_email_send_rate_limit",
    "over_request_rate_limit",
]);
const TOO_MANY = "Too many tries. Wait a few minutes and try again.";

/** Why an email change failed, for under the field. */
export const emailChangeError = (error: unknown): string => {
    const code = isAuthError(error) ? error.code : undefined;
    if (code === "email_exists") return "That email already has an account.";
    if (code === "email_address_invalid")
        return "That email can't be used. Try another.";
    if (code && RATE_LIMITED.has(code)) return TOO_MANY;
    return "Couldn't change your email. Try again.";
};

export type PasswordErrorField = "current" | "next" | "form";

/** Why a password change failed, and which field it belongs under. "form"
 *  has no field to blame. */
export const passwordChangeError = (
    error: unknown
): { field: PasswordErrorField; message: string } => {
    const code = isAuthError(error) ? error.code : undefined;
    if (code === "invalid_credentials")
        return {
            field: "current",
            message: "That isn't your current password.",
        };
    if (code === "same_password")
        return {
            field: "next",
            message: "That's your current password. Choose a new one.",
        };
    if (code === "weak_password")
        return { field: "next", message: "Choose a stronger password." };
    if (code && RATE_LIMITED.has(code))
        return { field: "current", message: TOO_MANY };
    return {
        field: "form",
        message: "Couldn't change your password. Try again.",
    };
};

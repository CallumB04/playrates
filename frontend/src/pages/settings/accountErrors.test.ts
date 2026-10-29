import { describe, expect, it } from "vitest";
import { AuthApiError, type User } from "@supabase/supabase-js";
import {
    emailChangeError,
    passwordChangeError,
    passwordlessProvider,
} from "./accountErrors";

const auth = (code: string) => new AuthApiError("from Supabase", 400, code);
const withProviders = (providers?: string[]) =>
    ({ app_metadata: { providers } }) as unknown as User;

describe("passwordlessProvider", () => {
    it("is null for an account with a password", () => {
        expect(passwordlessProvider(withProviders(["email"]))).toBeNull();
        expect(
            passwordlessProvider(withProviders(["google", "email"]))
        ).toBeNull();
    });

    it("names the provider of an account without one", () => {
        expect(passwordlessProvider(withProviders(["discord"]))).toBe(
            "Discord"
        );
    });

    it("assumes a password when it can't tell", () => {
        expect(passwordlessProvider(withProviders())).toBeNull();
        expect(passwordlessProvider(null)).toBeNull();
    });
});

describe("emailChangeError", () => {
    it("says when the address is someone else's", () => {
        expect(emailChangeError(auth("email_exists"))).toBe(
            "That email already has an account."
        );
    });

    it("asks for a wait when rate limited", () => {
        expect(emailChangeError(auth("over_email_send_rate_limit"))).toMatch(
            /wait a few minutes/i
        );
    });

    it("falls back to trying again", () => {
        expect(emailChangeError(new Error("offline"))).toBe(
            "Couldn't change your email. Try again."
        );
    });
});

describe("passwordChangeError", () => {
    it("blames the current password when the sign-in check fails", () => {
        expect(passwordChangeError(auth("invalid_credentials"))).toEqual({
            field: "current",
            message: "That isn't your current password.",
        });
    });

    it("puts Supabase's objections to the new one under it", () => {
        expect(passwordChangeError(auth("same_password")).field).toBe("next");
        expect(passwordChangeError(auth("weak_password")).field).toBe("next");
    });

    it("has no field to blame for anything else", () => {
        expect(passwordChangeError(new Error("offline")).field).toBe("form");
    });
});

import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../test/renderWithProviders";
import { supabase } from "../lib/supabase";
import { AuthProvider, useAuth } from "./AuthContext";

const SignOut = () => {
    const { signOut } = useAuth();
    return (
        <button type="button" onClick={() => void signOut()}>
            Sign out
        </button>
    );
};

describe("AuthProvider", () => {
    /* Supabase's default ends every session the account has, so signing
       out on one device signed out all of them. */
    it("signs out this device only", async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <AuthProvider>
                <SignOut />
            </AuthProvider>
        );

        await user.click(screen.getByRole("button", { name: "Sign out" }));

        expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    });
});

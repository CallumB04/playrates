import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { AuthApiError } from "@supabase/supabase-js";
import { server } from "../test/msw/server";
import { buildProfile } from "../test/msw/handlers";
import { renderWithProviders } from "../test/renderWithProviders";
import SettingsPage from "./SettingsPage";

const user = buildProfile();
const auth = vi.hoisted(() => ({
    providers: ["email"] as string[],
    newEmail: undefined as string | undefined,
    changeEmail: null as unknown as ReturnType<typeof vi.fn>,
    changePassword: null as unknown as ReturnType<typeof vi.fn>,
}));
const notify = vi.hoisted(() => vi.fn());

vi.mock("../contexts/AuthContext", () => ({
    useAuth: () => ({
        user,
        session: {
            user: {
                email: "dev@playrates.test",
                new_email: auth.newEmail,
                app_metadata: { providers: auth.providers },
            },
        },
        signOut: vi.fn(),
        changeEmail: auth.changeEmail,
        changePassword: auth.changePassword,
    }),
}));
vi.mock("../contexts/AccountFormContext", () => ({
    useAccountForm: () => ({ openLogin: vi.fn() }),
}));
vi.mock("../contexts/NotificationContext", async (importOriginal) => ({
    ...(await importOriginal<object>()),
    useNotify: () => notify,
}));

const API = "http://localhost:3000/api/v1";

beforeEach(() => {
    auth.providers = ["email"];
    auth.newEmail = undefined;
    auth.changeEmail = vi.fn(async () => ({ pending: true }));
    auth.changePassword = vi.fn(async () => {});
    notify.mockClear();
    server.use(
        // The close-account panel's counts; nothing here reads them.
        http.get(`${API}/users/:username/stats`, () =>
            HttpResponse.json({ logCount: 0 })
        )
    );
});

const open = (route = "/settings") => {
    renderWithProviders(<SettingsPage />, { route });
    return userEvent.setup({ delay: null });
};

describe("SettingsPage's way to the profile", () => {
    // Links from before the profile was edited only on the profile.
    it("opens the old Profile section as Account, with Edit profile", () => {
        open("/settings?section=profile");

        expect(
            screen.getByRole("link", { name: "Edit profile" })
        ).toHaveAttribute("href", "/user/devuser?edit=profile");
        expect(screen.getByLabelText("Username")).toBeInTheDocument();
    });
});

describe("SettingsPage's email", () => {
    it("says what's wrong with an address and doesn't send it", async () => {
        const u = open();
        const email = screen.getByLabelText("Email");

        await u.clear(email);
        await u.type(email, "not an email");
        await u.click(screen.getByRole("button", { name: "Change email" }));

        expect(
            await screen.findByText(
                "Enter an email address, like you@example.com."
            )
        ).toBeInTheDocument();
        expect(auth.changeEmail).not.toHaveBeenCalled();
    });

    it("sends the new address and says where the link went", async () => {
        const u = open();
        const email = screen.getByLabelText("Email");

        await u.clear(email);
        await u.type(email, " New@PlayRates.test ");
        await u.click(screen.getByRole("button", { name: "Change email" }));

        expect(auth.changeEmail).toHaveBeenCalledWith("new@playrates.test");
        expect(
            await screen.findByText(
                "We've sent a link to new@playrates.test. Your email changes once you follow it."
            )
        ).toBeInTheDocument();
        expect(notify).toHaveBeenCalledWith(
            "Check new@playrates.test to confirm it",
            "success"
        );
        // Still the old address until the link is followed.
        expect(email).toHaveValue("dev@playrates.test");
    });

    it("says when the address belongs to another account", async () => {
        auth.changeEmail.mockRejectedValue(
            new AuthApiError("taken", 422, "email_exists")
        );
        const u = open();
        const email = screen.getByLabelText("Email");

        await u.clear(email);
        await u.type(email, "taken@playrates.test");
        await u.click(screen.getByRole("button", { name: "Change email" }));

        expect(
            await screen.findByText("That email already has an account.")
        ).toBeInTheDocument();
    });

    it("keeps saying a change is waiting after a reload", () => {
        auth.newEmail = "later@playrates.test";
        open();

        expect(
            screen.getByText(/We've sent a link to later@playrates.test/)
        ).toBeInTheDocument();
    });
});

describe("SettingsPage's password", () => {
    const fill = async (
        u: ReturnType<typeof userEvent.setup>,
        values: { current?: string; next?: string; confirm?: string }
    ) => {
        await u.click(screen.getByRole("button", { name: "Change password" }));
        if (values.current)
            await u.type(
                screen.getByLabelText("Current password"),
                values.current
            );
        if (values.next)
            await u.type(screen.getByLabelText("New password"), values.next);
        if (values.confirm)
            await u.type(
                screen.getByLabelText("Confirm new password"),
                values.confirm
            );
        await u.click(
            screen.getByRole("button", { name: "Save new password" })
        );
    };

    it("holds a new password to the sign-up form's rule", async () => {
        const u = open();
        await fill(u, {
            current: "old-password",
            next: "short",
            confirm: "short",
        });

        expect(
            await screen.findByText(
                "Password needs to be at least 8 characters long"
            )
        ).toBeInTheDocument();
        expect(auth.changePassword).not.toHaveBeenCalled();
    });

    it("asks for the current password and a matching confirmation", async () => {
        const u = open();
        await fill(u, { next: "brand-new-pass", confirm: "brand-new-typo" });

        expect(
            await screen.findByText("Enter your current password.")
        ).toBeInTheDocument();
        expect(
            screen.getByText("The passwords don't match.")
        ).toBeInTheDocument();
        expect(auth.changePassword).not.toHaveBeenCalled();
    });

    it("won't take the current password as the new one", async () => {
        const u = open();
        await fill(u, {
            current: "same-password",
            next: "same-password",
            confirm: "same-password",
        });

        expect(
            await screen.findByText(
                "That's your current password. Choose a new one."
            )
        ).toBeInTheDocument();
        expect(auth.changePassword).not.toHaveBeenCalled();
    });

    it("checks the current password, then changes it and closes", async () => {
        const u = open();
        await fill(u, {
            current: "old-password",
            next: "brand-new-pass",
            confirm: "brand-new-pass",
        });

        await waitFor(() =>
            expect(notify).toHaveBeenCalledWith("Password changed", "success")
        );
        expect(auth.changePassword).toHaveBeenCalledWith(
            "old-password",
            "brand-new-pass",
            undefined
        );
        expect(
            screen.queryByLabelText("Current password")
        ).not.toBeInTheDocument();
    });

    it("says when the current password is wrong", async () => {
        auth.changePassword.mockRejectedValue(
            new AuthApiError(
                "Invalid login credentials",
                400,
                "invalid_credentials"
            )
        );
        const u = open();
        await fill(u, {
            current: "wrong-password",
            next: "brand-new-pass",
            confirm: "brand-new-pass",
        });

        expect(
            await screen.findByText("That isn't your current password.")
        ).toBeInTheDocument();
        expect(notify).not.toHaveBeenCalledWith("Password changed", "success");
    });

    it("has nothing to change for an account without a password", () => {
        auth.providers = ["google"];
        open();

        expect(
            screen.getByText(
                "You sign in with Google, so there’s no password to change."
            )
        ).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Change password" })
        ).not.toBeInTheDocument();
    });
});

describe("SettingsPage's emails", () => {
    const patched = vi.fn();

    beforeEach(() => {
        patched.mockClear();
        server.use(
            http.patch(`${API}/profiles/me`, async ({ request }) => {
                const body = (await request.json()) as Record<string, unknown>;
                patched(body);
                return HttpResponse.json(buildProfile());
            })
        );
    });

    it("turns one kind of email off, and only that one", async () => {
        const u = open("/settings?section=emails");

        const switchFor = screen.getByRole("switch", {
            name: "Friend requests",
        });
        expect(switchFor).toBeChecked();
        await u.click(switchFor);

        await waitFor(() =>
            expect(patched).toHaveBeenCalledWith({
                emailPrefs: { friend_requests: false },
            })
        );
        expect(switchFor).not.toBeChecked();
    });

    it("turns every email off with the first switch, and the rest read as off", async () => {
        const u = open("/settings?section=emails");

        await u.click(
            screen.getByRole("switch", { name: "Emails from PlayRates" })
        );

        await waitFor(() =>
            expect(patched).toHaveBeenCalledWith({ emailPrefs: { all: false } })
        );
        const news = screen.getByRole("switch", {
            name: "News and patch notes",
        });
        await waitFor(() => expect(news).toBeDisabled());
        expect(news).not.toBeChecked();

        // Each keeps its own choice for when emails come back on.
        await u.click(
            screen.getByRole("switch", { name: "Emails from PlayRates" })
        );
        await waitFor(() => expect(news).toBeChecked());
        expect(
            screen.getByText(/Account emails always send/)
        ).toBeInTheDocument();
    });

    it("puts a switch back when the change doesn't save", async () => {
        server.use(
            http.patch(`${API}/profiles/me`, () =>
                HttpResponse.json({ error: "nope" }, { status: 500 })
            )
        );
        const u = open("/settings?section=emails");
        const replies = screen.getByRole("switch", { name: "Replies to you" });

        await u.click(replies);

        await waitFor(() =>
            expect(notify).toHaveBeenCalledWith(
                "Couldn't save that setting",
                "error"
            )
        );
        expect(replies).toBeChecked();
    });
});

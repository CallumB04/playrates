import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../test/msw/server";
import { renderWithProviders } from "../../test/renderWithProviders";
import SignupForm from "./SignupForm";
import LoginForm from "./LoginForm";

const API = "http://localhost:3000/api/v1";

const signUp = vi.fn(async () => {});
const signIn = vi.fn(async () => {});
const close = vi.fn();

vi.mock("../../contexts/AuthContext", () => ({
    useAuth: () => ({ signUp, signIn }),
}));

vi.mock("../../contexts/AccountFormContext", () => ({
    useAccountForm: () => ({ close, openLogin: vi.fn(), openSignup: vi.fn() }),
}));

beforeEach(() => {
    signUp.mockClear();
    signIn.mockClear();
    close.mockClear();
});

describe("SignupForm", () => {
    const fill = async (
        user: ReturnType<typeof userEvent.setup>,
        values: { username?: string; email?: string; password?: string }
    ) => {
        if (values.username !== undefined) {
            await user.type(screen.getByLabelText("Username"), values.username);
        }
        if (values.email !== undefined) {
            await user.type(screen.getByLabelText("Email"), values.email);
        }
        if (values.password !== undefined) {
            await user.type(screen.getByLabelText("Password"), values.password);
        }
    };

    it("signs up with a valid submission", async () => {
        const user = userEvent.setup();
        const onSignedUp = vi.fn();
        renderWithProviders(<SignupForm onSignedUp={onSignedUp} />);

        await fill(user, {
            username: "brandnew",
            email: "New@Example.test",
            password: "longenough1",
        });
        await user.click(screen.getByRole("button", { name: "Sign up" }));

        await waitFor(() => expect(signUp).toHaveBeenCalledOnce());
        // the email is normalised before it reaches Supabase
        expect(signUp).toHaveBeenCalledWith(
            "new@example.test",
            "longenough1",
            "brandnew"
        );
        expect(onSignedUp).toHaveBeenCalledWith("new@example.test");
    });

    /**
     * Errors render from state, with a real aria-invalid. The old form toggled
     * a `hidden` class on a ref'd element, which bypassed React entirely and
     * announced nothing.
     */
    it("rejects a password under the minimum length, in the DOM", async () => {
        const user = userEvent.setup();
        renderWithProviders(<SignupForm onSignedUp={vi.fn()} />);

        await fill(user, {
            username: "brandnew",
            email: "new@example.test",
            password: "short",
        });
        await user.click(screen.getByRole("button", { name: "Sign up" }));

        expect(
            await screen.findByText(/at least 8 characters/i)
        ).toBeInTheDocument();
        expect(screen.getByLabelText("Password")).toHaveAttribute(
            "aria-invalid",
            "true"
        );
        expect(signUp).not.toHaveBeenCalled();
    });

    it("rejects a username with invalid characters", async () => {
        const user = userEvent.setup();
        renderWithProviders(<SignupForm onSignedUp={vi.fn()} />);

        await fill(user, {
            username: "bad name",
            email: "new@example.test",
            password: "longenough1",
        });
        await user.click(screen.getByRole("button", { name: "Sign up" }));

        expect(
            await screen.findByText(/letters, numbers and underscores/i)
        ).toBeInTheDocument();
        expect(signUp).not.toHaveBeenCalled();
    });

    it("rejects a username that is already taken", async () => {
        const user = userEvent.setup();
        renderWithProviders(<SignupForm onSignedUp={vi.fn()} />);

        // the default handler reports "devuser" as unavailable
        await fill(user, {
            username: "devuser",
            email: "new@example.test",
            password: "longenough1",
        });
        await user.click(screen.getByRole("button", { name: "Sign up" }));

        expect(
            await screen.findByText(/username is taken/i)
        ).toBeInTheDocument();
        expect(signUp).not.toHaveBeenCalled();
    });

    it("surfaces a failure from Supabase against the email field", async () => {
        signUp.mockRejectedValueOnce(new Error("User already registered"));
        const user = userEvent.setup();
        renderWithProviders(<SignupForm onSignedUp={vi.fn()} />);

        await fill(user, {
            username: "brandnew",
            email: "taken@example.test",
            password: "longenough1",
        });
        await user.click(screen.getByRole("button", { name: "Sign up" }));

        expect(
            await screen.findByText(/already registered/i)
        ).toBeInTheDocument();
    });

    it("checks availability against the API, not a user list", async () => {
        let called = false;
        server.use(
            http.get(`${API}/profiles/check-username`, () => {
                called = true;
                return HttpResponse.json({ available: true });
            })
        );

        const user = userEvent.setup();
        renderWithProviders(<SignupForm onSignedUp={vi.fn()} />);
        await fill(user, {
            username: "brandnew",
            email: "new@example.test",
            password: "longenough1",
        });
        await user.click(screen.getByRole("button", { name: "Sign up" }));

        await waitFor(() => expect(called).toBe(true));
    });
});

describe("LoginForm", () => {
    it("signs in and closes the modal", async () => {
        const user = userEvent.setup();
        renderWithProviders(<LoginForm />);

        await user.type(screen.getByLabelText("Email"), "dev@example.test");
        await user.type(screen.getByLabelText("Password"), "password123");
        await user.click(screen.getByRole("button", { name: "Log in" }));

        await waitFor(() => expect(signIn).toHaveBeenCalledOnce());
        expect(signIn).toHaveBeenCalledWith("dev@example.test", "password123");
        expect(close).toHaveBeenCalledOnce();
    });

    it("shows an error and keeps the modal open when sign-in fails", async () => {
        signIn.mockRejectedValueOnce(new Error("Invalid login credentials"));
        const user = userEvent.setup();
        renderWithProviders(<LoginForm />);

        await user.type(screen.getByLabelText("Email"), "dev@example.test");
        await user.type(screen.getByLabelText("Password"), "wrong");
        await user.click(screen.getByRole("button", { name: "Log in" }));

        expect(await screen.findByText(/not correct/i)).toBeInTheDocument();
        expect(close).not.toHaveBeenCalled();
    });

    it("prefills the email carried over from signup", () => {
        renderWithProviders(<LoginForm initialEmail="new@example.test" />);
        expect(screen.getByLabelText("Email")).toHaveValue("new@example.test");
    });

    /** The password is never compared in the browser any more. */
    it("never fetches a user record while signing in", async () => {
        const user = userEvent.setup();
        renderWithProviders(<LoginForm />);

        await user.type(screen.getByLabelText("Email"), "dev@example.test");
        await user.type(screen.getByLabelText("Password"), "password123");
        await user.click(screen.getByRole("button", { name: "Log in" }));

        // MSW is set to error on unhandled requests, and no profile handler is
        // hit here; reaching this line means only supabase.auth was used
        await waitFor(() => expect(signIn).toHaveBeenCalled());
    });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router-dom";
import { renderWithProviders } from "../../test/renderWithProviders";
import LoginPage from "./LoginPage";

const auth = vi.hoisted(() => ({
    session: null as unknown,
    resendConfirmation: vi.fn(),
}));
vi.mock("../../contexts/AuthContext", () => ({ useAuth: () => auth }));
// The forms are their own to test; here, the steps the page moves between.
vi.mock("../../components/auth/LoginForm", () => ({
    default: ({
        onUnconfirmed,
        onForgot,
    }: {
        onUnconfirmed: (email: string) => void;
        onForgot: (email: string) => void;
    }) => (
        <>
            <button onClick={() => onUnconfirmed("a@b.test")}>
                Unconfirmed
            </button>
            <button onClick={() => onForgot("a@b.test")}>Forgot</button>
        </>
    ),
}));
vi.mock("../../components/auth/ForgotPasswordForm", () => ({
    default: ({ initialEmail }: { initialEmail: string }) => (
        <p>reset for {initialEmail}</p>
    ),
}));

beforeEach(() => {
    auth.session = null;
});

const Where = () => <p data-testid="where">{useLocation().pathname}</p>;

const open = () =>
    renderWithProviders(
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Where />} />
        </Routes>,
        { route: "/login" }
    );

describe("LoginPage", () => {
    it("welcomes you back, with sign-up a press away", () => {
        open();
        expect(
            screen.getByRole("heading", { name: "Welcome back" })
        ).toBeInTheDocument();
        expect(
            screen.getByRole("link", { name: "Create an account" })
        ).toHaveAttribute("href", "/join");
    });

    it("asks for the email to be confirmed, then goes back to logging in", async () => {
        open();
        await userEvent.click(
            screen.getByRole("button", { name: "Unconfirmed" })
        );
        expect(
            screen.getByRole("heading", { name: "Check your inbox" })
        ).toBeInTheDocument();
        await userEvent.click(screen.getByRole("button", { name: "Log in" }));
        expect(
            screen.getByRole("heading", { name: "Welcome back" })
        ).toBeInTheDocument();
    });

    it("carries the email over to setting a new password", async () => {
        open();
        await userEvent.click(screen.getByRole("button", { name: "Forgot" }));
        expect(
            screen.getByRole("heading", { name: "Set a new password" })
        ).toBeInTheDocument();
        expect(screen.getByText("reset for a@b.test")).toBeInTheDocument();
    });

    it("opens on a new password when sent for one", () => {
        renderWithProviders(
            <Routes>
                <Route path="/login" element={<LoginPage />} />
            </Routes>,
            { route: { pathname: "/login", state: { step: "reset" } } as never }
        );
        expect(
            screen.getByRole("heading", { name: "Set a new password" })
        ).toBeInTheDocument();
    });

    it("has nothing for someone already signed in", () => {
        auth.session = {};
        open();
        expect(screen.getByTestId("where")).toHaveTextContent("/");
    });
});

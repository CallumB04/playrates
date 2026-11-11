import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router-dom";
import { renderWithProviders } from "../../test/renderWithProviders";
import JoinPage from "./JoinPage";

const auth = vi.hoisted(() => ({
    session: null as unknown,
    resendConfirmation: vi.fn(),
}));
vi.mock("../../contexts/AuthContext", () => ({ useAuth: () => auth }));
// The form itself is SignupForm's to test; here, what the page does after.
vi.mock("../../components/auth/SignupForm", () => ({
    default: ({
        onSignedUp,
    }: {
        onSignedUp: (email: string, signedIn: boolean) => void;
    }) => (
        <>
            <button onClick={() => onSignedUp("a@b.test", true)}>
                Signed in
            </button>
            <button onClick={() => onSignedUp("a@b.test", false)}>
                To confirm
            </button>
        </>
    ),
}));

beforeEach(() => {
    auth.session = null;
});

const Where = () => <p data-testid="where">{useLocation().pathname}</p>;

/** /join reached from a game page, as a Join button would send you. */
const open = () =>
    renderWithProviders(
        <Routes>
            <Route path="/join" element={<JoinPage />} />
            <Route path="*" element={<Where />} />
        </Routes>,
        { route: "/join" }
    );

describe("JoinPage", () => {
    it("asks for an account, with the log-in page a press away", () => {
        open();
        expect(
            screen.getByRole("heading", { name: "Create your account" })
        ).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute(
            "href",
            "/login"
        );
    });

    it("shows where the confirmation link went, on the same page", async () => {
        open();
        await userEvent.click(
            screen.getByRole("button", { name: "To confirm" })
        );
        expect(
            screen.getByRole("heading", { name: "Check your inbox" })
        ).toBeInTheDocument();
        expect(screen.getByText("a@b.test")).toBeInTheDocument();
    });

    it("goes on once sign-up has signed you straight in", async () => {
        open();
        await userEvent.click(
            screen.getByRole("button", { name: "Signed in" })
        );
        expect(screen.getByTestId("where")).toHaveTextContent("/");
    });

    it("has nothing for someone already signed in", () => {
        auth.session = {};
        open();
        expect(
            screen.queryByRole("heading", { name: "Create your account" })
        ).toBeNull();
        expect(screen.getByTestId("where")).toHaveTextContent("/");
    });
});

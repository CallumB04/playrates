import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import ForgotPasswordForm from "./ForgotPasswordForm";
import LoginForm from "./LoginForm";

const requestPasswordReset = vi.fn<(email: string) => Promise<void>>(
    async () => {}
);

vi.mock("../../contexts/AuthContext", () => ({
    useAuth: () => ({ requestPasswordReset, signIn: vi.fn() }),
}));

vi.mock("../../contexts/AccountFormContext", () => ({
    useAccountForm: () => ({ close: vi.fn() }),
}));

beforeEach(() => requestPasswordReset.mockReset());

describe("ForgotPasswordForm", () => {
    /* The same reply either way, or the form tells anyone who has an account. */
    it("sends the link and says so without saying whether the account exists", async () => {
        renderWithProviders(
            <ForgotPasswordForm initialEmail="kai@example.com" />
        );

        await userEvent.click(
            screen.getByRole("button", { name: "Send the link" })
        );

        expect(requestPasswordReset).toHaveBeenCalledWith("kai@example.com");
        expect(await screen.findByRole("status")).toHaveTextContent(
            "If an account uses kai@example.com"
        );
    });

    it("says so when the link didn't send", async () => {
        requestPasswordReset.mockRejectedValueOnce(new Error("rate limited"));
        renderWithProviders(
            <ForgotPasswordForm initialEmail="kai@example.com" />
        );

        await userEvent.click(
            screen.getByRole("button", { name: "Send the link" })
        );

        expect(await screen.findByText(/didn't send/)).toBeInTheDocument();
    });
});

describe("LoginForm's forgotten password link", () => {
    it("carries the typed email over", async () => {
        const onForgot = vi.fn();
        renderWithProviders(<LoginForm onForgot={onForgot} />);

        await userEvent.type(screen.getByLabelText("Email"), "kai@example.com");
        await userEvent.click(
            screen.getByRole("button", { name: "Forgot password?" })
        );

        expect(onForgot).toHaveBeenCalledWith("kai@example.com");
    });
});

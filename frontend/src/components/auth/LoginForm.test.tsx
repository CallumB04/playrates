import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import LoginForm from "./LoginForm";

const signIn = vi.hoisted(() => vi.fn());
vi.mock("../../contexts/AuthContext", () => ({
    useAuth: () => ({ signIn, signInWithProvider: vi.fn() }),
}));
vi.mock("../../contexts/AccountFormContext", () => ({
    useAccountForm: () => ({ close: vi.fn() }),
}));

const logIn = async () => {
    await userEvent.type(screen.getByLabelText("Email"), "new@b.test");
    await userEvent.type(screen.getByLabelText("Password"), "longenough1");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
};

describe("LoginForm", () => {
    // Right details, unconfirmed email: not a wrong password.
    it("sends an unconfirmed email to confirm it", async () => {
        signIn.mockRejectedValueOnce(
            Object.assign(new Error("Email not confirmed"), {
                code: "email_not_confirmed",
            })
        );
        const onUnconfirmed = vi.fn();
        renderWithProviders(<LoginForm onUnconfirmed={onUnconfirmed} />);
        await logIn();
        expect(onUnconfirmed).toHaveBeenCalledWith("new@b.test");
        expect(screen.queryByText(/not correct/)).toBeNull();
    });

    it("says wrong details are wrong", async () => {
        signIn.mockRejectedValueOnce(new Error("Invalid login credentials"));
        renderWithProviders(<LoginForm onUnconfirmed={vi.fn()} />);
        await logIn();
        expect(
            await screen.findByText("Those login details are not correct.")
        ).toBeInTheDocument();
    });
});

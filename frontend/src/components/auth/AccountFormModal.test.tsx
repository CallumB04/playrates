import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import AccountFormModal from "./AccountFormModal";

const form = vi.hoisted(() => ({
    mode: "signup" as const,
    openLogin: vi.fn(),
    openSignup: vi.fn(),
    openReset: vi.fn(),
    close: vi.fn(),
}));
vi.mock("../../contexts/AccountFormContext", () => ({
    useAccountForm: () => form,
}));
vi.mock("../../contexts/AuthContext", () => ({
    useAuth: () => ({ resendConfirmation: vi.fn() }),
}));

// The form itself is SignupForm's to test; here, only what follows it.
vi.mock("./SignupForm", () => ({
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
    form.close.mockClear();
    form.openLogin.mockClear();
});

describe("AccountFormModal", () => {
    // It used to open log-in over the new account, which also kept the
    // welcome from showing.
    it("closes once sign-up has signed you in", async () => {
        renderWithProviders(<AccountFormModal />);
        await userEvent.click(
            screen.getByRole("button", { name: "Signed in" })
        );
        expect(form.close).toHaveBeenCalled();
        expect(form.openLogin).not.toHaveBeenCalled();
    });

    it("asks for the email to be confirmed when it has to be", async () => {
        renderWithProviders(<AccountFormModal />);
        await userEvent.click(
            screen.getByRole("button", { name: "To confirm" })
        );
        expect(
            screen.getByRole("heading", { name: "Check your inbox" })
        ).toBeInTheDocument();
        expect(screen.getByText("a@b.test")).toBeInTheDocument();
        expect(form.close).not.toHaveBeenCalled();
    });
});

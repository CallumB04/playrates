import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import AccountFormModal from "./AccountFormModal";

const form = vi.hoisted(() => ({
    mode: "login" as "login" | "reset" | null,
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

// The form itself is LoginForm's to test; here, only what follows it.
vi.mock("./LoginForm", () => ({
    default: ({
        onUnconfirmed,
    }: {
        onUnconfirmed: (email: string) => void;
    }) => (
        <button onClick={() => onUnconfirmed("a@b.test")}>Unconfirmed</button>
    ),
}));

beforeEach(() => {
    form.mode = "login";
    form.openSignup.mockClear();
});

describe("AccountFormModal", () => {
    it("sends someone new to the sign-up page", async () => {
        renderWithProviders(<AccountFormModal />);
        await userEvent.click(
            screen.getByRole("button", { name: "Create an account" })
        );
        expect(form.openSignup).toHaveBeenCalled();
    });

    it("asks for the email to be confirmed when logging in needs it", async () => {
        renderWithProviders(<AccountFormModal />);
        await userEvent.click(
            screen.getByRole("button", { name: "Unconfirmed" })
        );
        expect(
            screen.getByRole("heading", { name: "Check your inbox" })
        ).toBeInTheDocument();
        expect(screen.getByText("a@b.test")).toBeInTheDocument();
    });

    it("draws nothing while it's closed", () => {
        form.mode = null;
        const { container } = renderWithProviders(<AccountFormModal />);
        expect(container).toBeEmptyDOMElement();
    });
});

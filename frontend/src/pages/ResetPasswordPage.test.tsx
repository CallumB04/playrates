import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../test/renderWithProviders";
import ResetPasswordPage from "./ResetPasswordPage";

const updatePassword = vi.fn<(password: string) => Promise<void>>(
    async () => {}
);
const openReset = vi.fn();
let session: object | null = { user: { id: "u1" } };

vi.mock("../contexts/AuthContext", () => ({
    useAuth: () => ({ session, isLoading: false, updatePassword }),
}));

vi.mock("../contexts/AccountFormContext", () => ({
    useAccountForm: () => ({ openReset }),
}));

beforeEach(() => {
    updatePassword.mockReset();
    openReset.mockReset();
    session = { user: { id: "u1" } };
});

describe("ResetPasswordPage", () => {
    it("saves a new password that meets the rules", async () => {
        renderWithProviders(<ResetPasswordPage />);

        await userEvent.type(
            screen.getByLabelText("New password"),
            "a-much-longer-one"
        );
        await userEvent.click(
            screen.getByRole("button", { name: "Save new password" })
        );

        await waitFor(() =>
            expect(updatePassword).toHaveBeenCalledWith("a-much-longer-one")
        );
    });

    it("refuses a password that's too short before sending it", async () => {
        renderWithProviders(<ResetPasswordPage />);

        await userEvent.type(screen.getByLabelText("New password"), "short");
        await userEvent.click(
            screen.getByRole("button", { name: "Save new password" })
        );

        expect(updatePassword).not.toHaveBeenCalled();
        expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("offers a new link when this one has expired", async () => {
        session = null;
        renderWithProviders(<ResetPasswordPage />);

        await userEvent.click(
            screen.getByRole("button", { name: "Send a new link" })
        );

        expect(openReset).toHaveBeenCalledOnce();
    });
});

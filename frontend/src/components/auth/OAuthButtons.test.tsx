import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import OAuthButtons from "./OAuthButtons";

const signInWithProvider = vi.fn<(provider: string) => Promise<void>>(
    async () => {}
);

const notify = vi.fn();

vi.mock("../../contexts/AuthContext", () => ({
    useAuth: () => ({ signInWithProvider }),
}));

vi.mock("../../contexts/NotificationContext", async (importOriginal) => ({
    ...(await importOriginal<object>()),
    useNotify: () => notify,
}));

beforeEach(() => {
    signInWithProvider.mockReset();
    notify.mockReset();
});

describe("OAuthButtons", () => {
    it.each([
        ["Google", "google"],
        ["Discord", "discord"],
    ])("sends Continue with %s to that provider", async (label, provider) => {
        const user = userEvent.setup();
        renderWithProviders(<OAuthButtons />);

        await user.click(
            screen.getByRole("button", { name: `Continue with ${label}` })
        );

        expect(signInWithProvider).toHaveBeenCalledWith(provider);
    });

    /* The page is about to leave; a second press would race the first. */
    it("holds both buttons while it heads off", async () => {
        signInWithProvider.mockReturnValue(new Promise(() => {}));
        const user = userEvent.setup();
        renderWithProviders(<OAuthButtons />);

        await user.click(
            screen.getByRole("button", { name: "Continue with Google" })
        );

        expect(
            screen.getByRole("button", { name: "Opening Google…" })
        ).toBeDisabled();
        expect(
            screen.getByRole("button", { name: "Continue with Discord" })
        ).toBeDisabled();
    });

    it("lets you try again when it can't get there", async () => {
        signInWithProvider.mockRejectedValue(new Error("offline"));
        const user = userEvent.setup();
        renderWithProviders(<OAuthButtons />);

        await user.click(
            screen.getByRole("button", { name: "Continue with Discord" })
        );

        expect(
            await screen.findByRole("button", { name: "Continue with Discord" })
        ).toBeEnabled();
        expect(notify).toHaveBeenCalledWith(
            expect.stringContaining("Couldn't reach the sign-in page"),
            "error"
        );
    });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { MyProfile } from "@playrates/shared";
import { server } from "../../test/msw/server";
import { buildProfile } from "../../test/msw/handlers";
import { renderWithProviders } from "../../test/renderWithProviders";
import ChooseUsername from "./ChooseUsername";

const API = "http://localhost:3000/api/v1";

const auth = vi.hoisted(() => ({
    user: null as MyProfile | null,
    signOut: vi.fn(async () => {}),
}));

vi.mock("../../contexts/AuthContext", () => ({
    useAuth: () => auth,
}));

const unchosen = () =>
    buildProfile({ username: "user_1a2b3c4d", usernameChosenAt: null });

beforeEach(() => {
    auth.user = unchosen();
    auth.signOut.mockClear();
});

const continueButton = () => screen.getByRole("button", { name: "Continue" });

describe("ChooseUsername", () => {
    it("asks nobody who has already chosen one", () => {
        auth.user = buildProfile();
        renderWithProviders(<ChooseUsername />);

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    /* Not the generated name, and not one from the provider either. */
    it("starts with an empty field", () => {
        renderWithProviders(<ChooseUsername />);

        expect(screen.getByLabelText("Username")).toHaveValue("");
    });

    it("waits for a free name and the agreement", async () => {
        const user = userEvent.setup();
        renderWithProviders(<ChooseUsername />);

        await user.type(screen.getByLabelText("Username"), "new_player");
        expect(await screen.findByText(/new_player is free/)).toBeVisible();
        expect(continueButton()).toBeDisabled();

        await user.click(screen.getByRole("checkbox", { name: /13 or older/ }));
        expect(continueButton()).toBeEnabled();
    });

    it("says when the name is taken", async () => {
        const user = userEvent.setup();
        renderWithProviders(<ChooseUsername />);

        await user.type(screen.getByLabelText("Username"), "devuser");
        await user.click(screen.getByRole("checkbox", { name: /13 or older/ }));

        expect(
            await screen.findByText("Sorry, that username is taken.")
        ).toBeVisible();
        expect(continueButton()).toBeDisabled();
    });

    it("says what is wrong with a name it would never accept", async () => {
        const user = userEvent.setup();
        renderWithProviders(<ChooseUsername />);

        await user.type(screen.getByLabelText("Username"), "no spaces");

        expect(
            await screen.findByText("Letters, numbers and underscores only")
        ).toBeVisible();
    });

    it("saves the name", async () => {
        let sent: unknown;
        server.use(
            http.patch(`${API}/profiles/me`, async ({ request }) => {
                sent = await request.json();
                return HttpResponse.json(
                    buildProfile({ username: "new_player" })
                );
            })
        );
        const user = userEvent.setup();
        renderWithProviders(<ChooseUsername />);

        await user.type(screen.getByLabelText("Username"), "new_player");
        await user.click(screen.getByRole("checkbox", { name: /13 or older/ }));
        await waitFor(() => expect(continueButton()).toBeEnabled());
        await user.click(continueButton());

        await waitFor(() => expect(sent).toEqual({ username: "new_player" }));
    });

    /* Free when checked, gone by the time it was saved. */
    it("owns up when someone got there first", async () => {
        server.use(
            http.patch(`${API}/profiles/me`, () =>
                HttpResponse.json(
                    {
                        error: {
                            code: "username_taken",
                            message: "That username is already taken",
                        },
                    },
                    { status: 409 }
                )
            )
        );
        const user = userEvent.setup();
        renderWithProviders(<ChooseUsername />);

        await user.type(screen.getByLabelText("Username"), "new_player");
        await user.click(screen.getByRole("checkbox", { name: /13 or older/ }));
        await waitFor(() => expect(continueButton()).toBeEnabled());
        await user.click(continueButton());

        expect(
            await screen.findByText("Sorry, that username is taken.")
        ).toBeVisible();
    });

    it("can't be dismissed, only left by signing out", async () => {
        const user = userEvent.setup();
        renderWithProviders(<ChooseUsername />);

        await user.keyboard("{Escape}");
        expect(screen.getByRole("dialog")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Sign out" }));
        expect(auth.signOut).toHaveBeenCalledOnce();
    });
});

import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../test/msw/server";
import { buildProfile } from "../../test/msw/handlers";
import { renderWithProviders } from "../../test/renderWithProviders";
import WelcomePopup from "./WelcomePopup";

const API = "http://localhost:3000/api/v1";

const profile = {
    username: "newplayer",
    firstName: null,
    avatarUrl: null,
    accent: "indigo" as const,
};

/** Records every write, so a test can say which ones happened. */
const captureWrites = (status = 200) => {
    const patches = vi.fn();
    server.use(
        http.patch(`${API}/profiles/me`, async ({ request }) => {
            patches(await request.json());
            return status === 200
                ? HttpResponse.json(buildProfile({ firstName: "Callum" }))
                : new HttpResponse(null, { status });
        })
    );
    return patches;
};

const renderPopup = (props: { preview?: boolean } = {}) => {
    const onClose = vi.fn();
    renderWithProviders(
        <WelcomePopup profile={profile} onClose={onClose} {...props} />
    );
    return { onClose };
};

describe("WelcomePopup", () => {
    it("says once that both fields are optional", () => {
        renderPopup();

        expect(
            screen.getByText("Two things before you explore, both optional.")
        ).toBeInTheDocument();
        expect(screen.getByLabelText("First name")).toBeInTheDocument();
        expect(
            screen.getByRole("group", { name: "Profile picture" })
        ).toBeInTheDocument();
    });

    it("saves a first name and closes, with nothing after it", async () => {
        const patches = captureWrites();
        const { onClose } = renderPopup();

        await userEvent.type(screen.getByLabelText("First name"), "Callum");
        await userEvent.click(screen.getByRole("button", { name: "Save" }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(patches).toHaveBeenCalledWith({ firstName: "Callum" });
    });

    /* Both fields are optional: saving with neither is not a write. */
    it("writes nothing when saving with nothing filled in", async () => {
        const patches = captureWrites();
        const { onClose } = renderPopup();

        await userEvent.click(screen.getByRole("button", { name: "Save" }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(patches).not.toHaveBeenCalled();
    });

    it("lets a new account skip straight past", async () => {
        const patches = captureWrites();
        const { onClose } = renderPopup();

        await userEvent.type(screen.getByLabelText("First name"), "Callum");
        await userEvent.click(
            screen.getByRole("button", { name: "Skip for now" })
        );

        expect(onClose).toHaveBeenCalled();
        expect(patches).not.toHaveBeenCalled();
    });

    it("stays open when the save fails, keeping what was typed", async () => {
        captureWrites(500);
        const { onClose } = renderPopup();

        await userEvent.type(screen.getByLabelText("First name"), "Callum");
        await userEvent.click(screen.getByRole("button", { name: "Save" }));

        await waitFor(() =>
            expect(screen.getByRole("button", { name: "Save" })).toBeEnabled()
        );
        expect(screen.getByLabelText("First name")).toHaveValue("Callum");
        expect(onClose).not.toHaveBeenCalled();
    });

    it("points to Settings for the rest", () => {
        renderPopup();

        expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
            "href",
            "/settings"
        );
    });

    /* The admin preview is somebody's real account: walking through it must
       not rename them. */
    it("saves nothing in preview", async () => {
        const patches = captureWrites();
        const { onClose } = renderPopup({ preview: true });

        expect(
            screen.getByText(/nothing you enter here is saved/)
        ).toBeInTheDocument();
        await userEvent.type(screen.getByLabelText("First name"), "Callum");
        await userEvent.click(screen.getByRole("button", { name: "Save" }));

        expect(onClose).toHaveBeenCalled();
        expect(patches).not.toHaveBeenCalled();
    });
});

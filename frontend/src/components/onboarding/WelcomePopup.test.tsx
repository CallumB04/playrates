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

const gamesStep = () =>
    screen.findByRole("heading", { name: "Games you’ve played" });

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

    it("saves a first name, then asks for games played", async () => {
        const patches = captureWrites();
        const { onClose } = renderPopup();

        await userEvent.type(screen.getByLabelText("First name"), "Callum");
        await userEvent.click(screen.getByRole("button", { name: "Save" }));

        expect(await gamesStep()).toBeInTheDocument();
        expect(onClose).not.toHaveBeenCalled();
        expect(patches).toHaveBeenCalledWith({
            firstName: "Callum",
            aboutVisibility: { firstName: "everyone" },
        });
    });

    it("keeps the name hidden when asked to as it's given", async () => {
        const patches = captureWrites();
        const { onClose } = renderPopup();

        await userEvent.type(screen.getByLabelText("First name"), "Callum");
        await userEvent.click(
            screen.getByRole("switch", { name: "Show it on my profile" })
        );
        await userEvent.click(screen.getByRole("button", { name: "Save" }));

        expect(await gamesStep()).toBeInTheDocument();
        expect(onClose).not.toHaveBeenCalled();
        expect(patches).toHaveBeenCalledWith({
            firstName: "Callum",
            aboutVisibility: { firstName: "private" },
        });
    });

    /* Both fields are optional: saving with neither is not a write. */
    it("writes nothing when saving with nothing filled in", async () => {
        const patches = captureWrites();
        renderPopup();

        await userEvent.click(screen.getByRole("button", { name: "Save" }));

        expect(await gamesStep()).toBeInTheDocument();
        expect(patches).not.toHaveBeenCalled();
    });

    it("lets a new account skip straight past both steps", async () => {
        const patches = captureWrites();
        const { onClose } = renderPopup();

        await userEvent.type(screen.getByLabelText("First name"), "Callum");
        await userEvent.click(
            screen.getByRole("button", { name: "Skip for now" })
        );
        expect(await gamesStep()).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole("button", { name: "Skip for now" })
        );

        expect(onClose).toHaveBeenCalled();
        expect(patches).not.toHaveBeenCalled();
    });

    // An empty shelf is the hardest start: the games tapped go on as played.
    it("puts the games tapped on the shelves as played", async () => {
        const logged = vi.fn();
        server.use(
            http.post(`${API}/me/logs`, async ({ request }) => {
                logged(await request.json());
                return HttpResponse.json({});
            })
        );
        const { onClose } = renderPopup();
        await userEvent.click(
            screen.getByRole("button", { name: "Skip for now" })
        );
        await userEvent.click(
            await screen.findByRole("button", { name: "Portal 2" })
        );
        await userEvent.click(
            screen.getByRole("button", { name: "Add 1 game" })
        );

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(logged).toHaveBeenCalledWith({ gameId: 2, status: "played" });
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

    it("points to Edit profile for the rest", () => {
        renderPopup();

        expect(
            screen.getByRole("link", { name: "Edit profile" })
        ).toHaveAttribute("href", "/user/newplayer?edit=profile");
    });

    /* The admin preview is somebody's real account: walking through it must
       not rename them. */
    it("saves nothing in preview", async () => {
        const patches = captureWrites();
        const { onClose } = renderPopup({ preview: true });

        expect(
            screen.getByText(/nothing you enter here is saved/i)
        ).toBeInTheDocument();
        await userEvent.type(screen.getByLabelText("First name"), "Callum");
        await userEvent.click(screen.getByRole("button", { name: "Save" }));
        expect(await gamesStep()).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole("button", { name: "Skip for now" })
        );

        expect(onClose).toHaveBeenCalled();
        expect(patches).not.toHaveBeenCalled();
    });
});

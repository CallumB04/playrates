import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { SteamPreview } from "@playrates/shared";
import { server } from "../../test/msw/server";
import { renderWithProviders } from "../../test/renderWithProviders";
import SteamImportModal from "./SteamImportModal";

const API = "http://localhost:3000/api/v1";

const library: SteamPreview = {
    total: 3,
    items: [
        {
            appid: 10,
            name: "Hades",
            hours: 25,
            game: { id: 1, title: "Hades", coverUrl: null },
            logged: false,
            suggested: "played",
        },
        {
            appid: 20,
            name: "Celeste",
            hours: 0,
            game: { id: 2, title: "Celeste", coverUrl: null },
            logged: false,
            suggested: "backlog",
        },
        {
            appid: 30,
            name: "Some Tool",
            hours: 1,
            game: null,
            logged: false,
            suggested: "played",
        },
    ],
};

describe("SteamImportModal", () => {
    it("finds the library, lets each game be changed, and adds the rest", async () => {
        let sent: unknown = null;
        server.use(
            http.post(`${API}/me/steam/preview`, () =>
                HttpResponse.json(library)
            ),
            http.post(`${API}/me/steam/import`, async ({ request }) => {
                sent = await request.json();
                return HttpResponse.json({ added: 1, skipped: 0 });
            })
        );
        const onClose = vi.fn();
        renderWithProviders(
            <SteamImportModal initialProfile="callum" onClose={onClose} />
        );

        await userEvent.click(
            screen.getByRole("button", { name: "Find my games" })
        );
        expect(await screen.findByText("25 hours")).toBeInTheDocument();
        expect(screen.getByText(/1 we couldn’t match/)).toBeInTheDocument();

        await userEvent.selectOptions(
            screen.getByRole("combobox", { name: "Celeste" }),
            "skip"
        );
        await userEvent.click(
            screen.getByRole("button", { name: "Add 1 game" })
        );

        expect(sent).toEqual({
            games: [{ gameId: 1, status: "played", hours: 25 }],
        });
        expect(onClose).toHaveBeenCalled();
    });

    it("says how to open a private library", async () => {
        server.use(
            http.post(`${API}/me/steam/preview`, () =>
                HttpResponse.json(
                    {
                        error: {
                            code: "steam_private",
                            message: "That Steam library is private",
                        },
                    },
                    { status: 422 }
                )
            )
        );
        renderWithProviders(
            <SteamImportModal initialProfile="callum" onClose={vi.fn()} />
        );
        await userEvent.click(
            screen.getByRole("button", { name: "Find my games" })
        );
        expect(await screen.findByRole("alert")).toHaveTextContent(
            "set Game details to Public"
        );
    });
});

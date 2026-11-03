import { describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { SteamPreview } from "@playrates/shared";
import { server } from "../../test/msw/server";
import { renderWithProviders } from "../../test/renderWithProviders";
import SteamImportModal from "./SteamImportModal";

const API = "http://localhost:3000/api/v1";

const library: SteamPreview = {
    steamId: "76561198000000001",
    total: 4,
    items: [
        {
            appid: 10,
            name: "Hades",
            hours: 25,
            game: { id: 1, title: "Hades", coverUrl: null },
            logged: false,
            suggested: "played",
            achievements: true,
            fills: null,
        },
        {
            appid: 20,
            name: "Celeste",
            hours: 0,
            game: { id: 2, title: "Celeste", coverUrl: null },
            logged: false,
            suggested: "backlog",
            achievements: false,
            fills: null,
        },
        {
            appid: 40,
            name: "Hollow Knight",
            hours: 12,
            game: { id: 4, title: "Hollow Knight", coverUrl: null },
            logged: true,
            suggested: "played",
            achievements: true,
            fills: { platform: true, hours: true, achievements: true },
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

/** The API for the whole flow; `achievements` answers the batches, and
 *  resolving `release` lets them come back. */
const steamApi = ({ hold = false } = {}) => {
    let sent: unknown = null;
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    server.use(
        http.post(`${API}/me/steam/preview`, () => HttpResponse.json(library)),
        http.post(`${API}/me/steam/achievements`, async ({ request }) => {
            if (hold) await held;
            const { appids } = (await request.json()) as { appids: number[] };
            return HttpResponse.json(
                appids.map((appid) => ({
                    appid,
                    achievements:
                        appid === 10
                            ? { total: 49, unlocked: 31 }
                            : { total: 20, unlocked: 20 },
                }))
            );
        }),
        http.post(`${API}/me/steam/import`, async ({ request }) => {
            sent = await request.json();
            return HttpResponse.json({ added: 1, skipped: 0, updated: 1 });
        })
    );
    return { sent: () => sent, release };
};

const open = async () => {
    const onClose = vi.fn();
    renderWithProviders(
        <SteamImportModal initialProfile="callum" onClose={onClose} />
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Find my games" }));
    await screen.findByText("25 hours");
    return { user, onClose };
};

const row = (title: string) =>
    screen.getByRole("button", { name: `Details for ${title}` }).closest("li")!;

describe("SteamImportModal", () => {
    it("checks each game's achievements, saying so as it goes", async () => {
        const api = steamApi({ hold: true });
        await open();

        expect(
            screen.getByText("Checking Steam for achievements")
        ).toBeInTheDocument();
        expect(screen.getByText("0/2")).toBeInTheDocument();
        expect(
            within(row("Hades")).getByText("Checking achievements…")
        ).toBeInTheDocument();
        // A game with none to unlock isn't asked about.
        expect(
            within(row("Celeste")).queryByText("Checking achievements…")
        ).toBeNull();

        api.release();
        expect(
            await within(row("Hades")).findByText("31 of 49 achievements")
        ).toBeInTheDocument();
        expect(screen.queryByText(/Checking Steam/)).toBeNull();
    });

    it("rates a game and says how it ended, then adds it on Steam", async () => {
        const api = steamApi();
        const { user, onClose } = await open();
        await within(row("Hades")).findByText("31 of 49 achievements");
        expect(within(row("Hades")).getByText("Not rated")).toBeInTheDocument();
        expect(
            within(row("Hades")).getByText("Just played")
        ).toBeInTheDocument();

        await user.click(
            screen.getByRole("button", { name: "Details for Hades" })
        );
        screen.getByRole("slider", { name: "Your rating" }).focus();
        await user.keyboard("{End}");
        await user.click(screen.getByRole("button", { name: "How it ended" }));
        await user.click(
            await screen.findByRole("option", { name: /Finished/ })
        );
        // Closed again, the row says what's set.
        await user.click(
            screen.getByRole("button", { name: "Details for Hades" })
        );
        expect(within(row("Hades")).getByText("Rated 10")).toBeInTheDocument();
        expect(within(row("Hades")).getByText("Finished")).toBeInTheDocument();

        await user.click(
            screen.getByRole("button", { name: "Celeste: add as" })
        );
        await user.click(await screen.findByRole("option", { name: "Skip" }));
        await user.click(
            screen.getByRole("button", { name: "Add 1, update 1" })
        );

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(api.sent()).toEqual({
            games: [
                {
                    gameId: 1,
                    status: "played",
                    hours: 25,
                    rating: 10,
                    playedStatus: "finished",
                    achievementsTotal: 49,
                    achievementsCompleted: 31,
                },
            ],
            fill: [
                {
                    gameId: 4,
                    hours: 12,
                    achievementsTotal: 20,
                    achievementsCompleted: 20,
                },
            ],
        });
    });

    it("leaves games already logged alone when asked to", async () => {
        const api = steamApi();
        const { user } = await open();
        expect(
            screen.getByText(/Adds Steam as the platform on 1, hours on 1/)
        ).toBeInTheDocument();

        await user.click(
            screen.getByRole("switch", {
                name: "Fill in 1 game you’ve logged",
            })
        );
        await user.click(screen.getByRole("button", { name: "Add 2 games" }));

        await waitFor(() => expect(api.sent()).not.toBeNull());
        expect(api.sent()).not.toHaveProperty("fill");
    });

    it("says when Steam keeps the achievements private", async () => {
        steamApi();
        server.use(
            http.post(`${API}/me/steam/achievements`, () =>
                HttpResponse.json(
                    { error: { code: "steam_private", message: "Private" } },
                    { status: 422 }
                )
            )
        );
        await open();
        expect(
            await screen.findByText(/Steam keeps your achievements private/)
        ).toBeInTheDocument();
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

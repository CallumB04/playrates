import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { PlatformSystem, WishlistEntry } from "@playrates/shared";
import { server } from "../../../test/msw/server";
import { buildGame, buildGameLog } from "../../../test/msw/handlers";
import { renderWithProviders } from "../../../test/renderWithProviders";
import WishlistConsoles from "./WishlistConsoles";

const API = "http://localhost:3000/api/v1";

const systems: PlatformSystem[] = [
    {
        slug: "steam",
        displayName: "Steam",
        platformSlug: "steam",
        sortOrder: 1,
    },
    {
        slug: "playstation5",
        displayName: "PlayStation 5",
        platformSlug: "playstation",
        sortOrder: 2,
    },
    {
        slug: "xbox-series-x",
        displayName: "Xbox Series X|S",
        platformSlug: "xbox",
        sortOrder: 3,
    },
] as PlatformSystem[];

const entry = (system: string | null): WishlistEntry =>
    ({
        gameId: 7,
        game: { id: 7, title: "Fallout 4" },
        logs: [buildGameLog({ id: 70, gameId: 7, status: "wishlist", system })],
        rollup: {},
        rank: 1,
        consoles: [system],
    }) as unknown as WishlistEntry;

const capture = () => {
    const sent: { method: string; body: unknown }[] = [];
    server.use(
        http.get(`${API}/games/7`, () =>
            HttpResponse.json(
                buildGame({
                    id: 7,
                    systems: ["steam", "playstation5", "xbox-series-x"],
                })
            )
        ),
        http.patch(`${API}/me/logs/70`, async ({ request }) => {
            sent.push({ method: "PATCH", body: await request.json() });
            return HttpResponse.json(buildGameLog({ id: 70 }));
        }),
        http.post(`${API}/me/logs`, async ({ request }) => {
            sent.push({ method: "POST", body: await request.json() });
            return HttpResponse.json(buildGameLog({ id: 71 }), { status: 201 });
        })
    );
    return sent;
};

describe("WishlistConsoles", () => {
    it("changes a wish's platform from its chip", async () => {
        const sent = capture();
        renderWithProviders(
            <WishlistConsoles entry={entry("playstation5")} systems={systems} />
        );

        await userEvent.click(
            screen.getByRole("button", {
                name: /Platform for Fallout 4: PlayStation 5/,
            })
        );
        await userEvent.click(
            await screen.findByRole("option", { name: /Xbox Series X\|S/ })
        );

        await waitFor(() =>
            expect(sent).toEqual([
                {
                    method: "PATCH",
                    body: { system: "xbox-series-x", platform: "xbox" },
                },
            ])
        );
    });

    it("adds another platform with the +, leaving out the one it has", async () => {
        const sent = capture();
        renderWithProviders(
            <WishlistConsoles entry={entry("playstation5")} systems={systems} />
        );

        await userEvent.click(
            screen.getByRole("button", { name: "Add a platform for Fallout 4" })
        );
        expect(
            screen.queryByRole("option", { name: /PlayStation 5/ })
        ).toBeNull();
        await userEvent.click(
            await screen.findByRole("option", { name: /Steam/ })
        );

        await waitFor(() =>
            expect(sent).toEqual([
                {
                    method: "POST",
                    body: {
                        gameId: 7,
                        status: "wishlist",
                        system: "steam",
                        platform: "steam",
                    },
                },
            ])
        );
    });

    it("offers no + while the only wish is for any platform", () => {
        capture();
        renderWithProviders(
            <WishlistConsoles entry={entry(null)} systems={systems} />
        );
        expect(
            screen.getByRole("button", {
                name: /Platform for Fallout 4: Any platform/,
            })
        ).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: /Add a platform/ })
        ).toBeNull();
    });
});

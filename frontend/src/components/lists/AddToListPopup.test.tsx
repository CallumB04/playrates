import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { MyListOption } from "@playrates/shared";
import { server } from "../../test/msw/server";
import { renderWithProviders } from "../../test/renderWithProviders";
import AddToListPopup from "./AddToListPopup";

const API = "http://localhost:3000/api/v1";

const option = (id: number, name: string, hasGame: boolean): MyListOption => ({
    id,
    name,
    colour: null,
    visibility: "everyone",
    gameCount: hasGame ? 3 : 2,
    hasGame,
});

let calls: string[];
// Which lists hold the game, as the server would answer after a change.
let holding: Set<number>;

beforeEach(() => {
    calls = [];
    holding = new Set([2]);
    server.use(
        http.get(`${API}/me/lists`, () =>
            HttpResponse.json([
                option(1, "Cosy games", holding.has(1)),
                option(2, "Best RPGs", holding.has(2)),
            ])
        ),
        http.post(`${API}/me/lists/:listId/games`, ({ params }) => {
            calls.push(`add:${params.listId}`);
            holding.add(Number(params.listId));
            return new HttpResponse(null, { status: 204 });
        }),
        http.delete(`${API}/me/lists/:listId/games/:gameId`, ({ params }) => {
            calls.push(`remove:${params.listId}:${params.gameId}`);
            holding.delete(Number(params.listId));
            return new HttpResponse(null, { status: 204 });
        })
    );
});

describe("AddToListPopup", () => {
    it("marks the lists the game is in, and changes one as it's pressed", async () => {
        renderWithProviders(<AddToListPopup gameId={7} onClose={vi.fn()} />);
        const user = userEvent.setup({ delay: null });

        const cosy = await screen.findByRole("checkbox", {
            name: /Cosy games/,
        });
        const rpgs = screen.getByRole("checkbox", { name: /Best RPGs/ });
        expect(cosy).toHaveAttribute("aria-checked", "false");
        expect(rpgs).toHaveAttribute("aria-checked", "true");

        await user.click(cosy);
        await waitFor(() =>
            expect(cosy).toHaveAttribute("aria-checked", "true")
        );
        await user.click(rpgs);

        await waitFor(() => expect(calls).toEqual(["add:1", "remove:2:7"]));
        await waitFor(() =>
            expect(rpgs).toHaveAttribute("aria-checked", "false")
        );
    });

    it("puts it back and says so when a change fails", async () => {
        server.use(
            http.post(`${API}/me/lists/:listId/games`, () =>
                HttpResponse.json(
                    { error: { message: "A list holds up to 500 games" } },
                    { status: 422 }
                )
            )
        );
        renderWithProviders(<AddToListPopup gameId={7} onClose={vi.fn()} />);
        const user = userEvent.setup({ delay: null });

        const cosy = await screen.findByRole("checkbox", {
            name: /Cosy games/,
        });
        await user.click(cosy);

        await waitFor(() =>
            expect(cosy).toHaveAttribute("aria-checked", "false")
        );
    });
});

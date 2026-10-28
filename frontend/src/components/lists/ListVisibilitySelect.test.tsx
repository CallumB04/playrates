import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { GameListDetail } from "@playrates/shared";
import { server } from "../../test/msw/server";
import { renderWithProviders } from "../../test/renderWithProviders";
import ListVisibilitySelect from "./ListVisibilitySelect";

const API = "http://localhost:3000/api/v1";

const list: GameListDetail = {
    id: 9,
    name: "Best RPGs",
    description: "",
    visibility: "everyone",
    colour: null,
    ranked: false,
    gameCount: 0,
    voteCount: 0,
    votedByViewer: false,
    covers: [],
    owner: { username: "devuser", avatarUrl: null, accent: "indigo" },
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    coverGameIds: null,
    games: [],
};

describe("ListVisibilitySelect", () => {
    it("says who can see the list, and saves a new choice as it's picked", async () => {
        let sent: unknown = null;
        server.use(
            http.patch(`${API}/me/lists/9`, async ({ request }) => {
                sent = await request.json();
                return HttpResponse.json({ ...list, visibility: "private" });
            })
        );
        renderWithProviders(<ListVisibilitySelect list={list} />);
        const user = userEvent.setup({ delay: null });

        const trigger = screen.getByRole("button", {
            name: "Who can see this list: Everyone",
        });
        await user.click(trigger);
        await user.click(
            await screen.findByRole("option", { name: /Only me/ })
        );

        await waitFor(() => expect(sent).toEqual({ visibility: "private" }));
    });
});

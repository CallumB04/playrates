import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../test/msw/server";
import { API_BASE, buildGame, paginated } from "../../test/msw/handlers";
import { renderWithProviders } from "../../test/renderWithProviders";
import PlayedGamesStep from "./PlayedGamesStep";

describe("PlayedGamesStep", () => {
    it("searches past the most logged for a game someone has played", async () => {
        const searched: (string | null)[] = [];
        server.use(
            http.get(`${API_BASE}/games`, ({ request }) => {
                const search = new URL(request.url).searchParams.get("search");
                searched.push(search);
                return HttpResponse.json(
                    paginated(
                        search
                            ? [buildGame({ id: 9, title: "Pentiment" })]
                            : [buildGame({ id: 1, title: "Hades" })]
                    )
                );
            })
        );
        renderWithProviders(
            <PlayedGamesStep titleId="t" preview onDone={vi.fn()} />
        );
        const u = userEvent.setup();

        expect(
            await screen.findByRole("button", { name: "Hades" })
        ).toBeInTheDocument();
        await u.type(screen.getByLabelText("Search for a game"), "penti");

        expect(
            await screen.findByRole("button", { name: "Pentiment" })
        ).toBeInTheDocument();
        await waitFor(() => expect(searched).toContain("penti"));
    });
});

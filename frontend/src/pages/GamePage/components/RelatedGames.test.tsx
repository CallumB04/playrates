import { beforeAll, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { GameRelated } from "@playrates/shared";
import { server } from "../../../test/msw/server";
import { buildGame } from "../../../test/msw/handlers";
import { renderWithProviders } from "../../../test/renderWithProviders";
import RelatedGames from "./RelatedGames";

const API = "http://localhost:3000/api/v1";

// The rails measure themselves; jsdom has nothing to measure with.
beforeAll(() => {
    vi.stubGlobal(
        "ResizeObserver",
        class {
            observe() {}
            disconnect() {}
        }
    );
});

const answer = (related: GameRelated) =>
    server.use(
        http.get(`${API}/games/1/related`, () => HttpResponse.json(related))
    );

describe("RelatedGames", () => {
    it("shows each row that has games, titled by what links them", async () => {
        answer({
            series: {
                name: "The Witcher",
                games: [buildGame({ id: 2, title: "The Witcher 2" })],
            },
            developer: {
                name: "CD Projekt RED",
                games: [buildGame({ id: 3, title: "Cyberpunk 2077" })],
            },
            similar: [],
        });

        renderWithProviders(<RelatedGames gameId={1} platforms={[]} />);

        expect(
            await screen.findByRole("heading", { name: "The Witcher series" })
        ).toBeInTheDocument();
        expect(
            screen.getByRole("heading", { name: "More from CD Projekt RED" })
        ).toBeInTheDocument();
        expect(
            screen.queryByRole("heading", { name: "You might also like" })
        ).toBeNull();
        expect(screen.getByText("Cyberpunk 2077")).toBeInTheDocument();
    });

    it("doesn't say 'The The' when the series name has its own", async () => {
        answer({
            series: {
                name: "The Legend of Zelda",
                games: [buildGame({ id: 2 })],
            },
            developer: null,
            similar: [],
        });

        renderWithProviders(<RelatedGames gameId={1} platforms={[]} />);

        expect(
            await screen.findByRole("heading", {
                name: "The Legend of Zelda series",
            })
        ).toBeInTheDocument();
    });

    it("leaves the whole section out when there is nothing to show", async () => {
        answer({ series: null, developer: null, similar: [] });

        const { container } = renderWithProviders(
            <RelatedGames gameId={1} platforms={[]} />
        );

        await new Promise((r) => setTimeout(r, 50));
        expect(container).toBeEmptyDOMElement();
    });
});

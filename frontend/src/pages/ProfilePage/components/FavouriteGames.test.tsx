import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../../../test/msw/server";
import { buildGame } from "../../../test/msw/handlers";
import { renderWithProviders } from "../../../test/renderWithProviders";
import FavouriteGames from "./FavouriteGames";

// The viewer has every game wishlisted, which mustn't show on someone
// else's favourites.
vi.mock("../../../components/game/useTileActions", () => ({
    useTileActions: () => ({
        actionsFor: () => [],
        statusFor: () => "wishlist",
        logFor: () => undefined,
    }),
}));

const API = "http://localhost:3000/api/v1";

describe("FavouriteGames", () => {
    // It used to show the viewer's own status, which read as the owner's.
    it("shows what the owner did with each game", async () => {
        server.use(
            http.get(`${API}/users/marlowe/favourites`, () =>
                HttpResponse.json([
                    {
                        ...buildGame({ id: 4, title: "Outer Wilds" }),
                        ownerStatus: {
                            status: "played",
                            playedStatus: "finished",
                        },
                    },
                    {
                        ...buildGame({ id: 5, title: "Hades" }),
                        ownerStatus: null,
                    },
                ])
            )
        );
        renderWithProviders(<FavouriteGames username="marlowe" canSee />);
        expect(await screen.findByText("Outer Wilds")).toBeInTheDocument();
        expect(screen.getAllByText("Finished")).toHaveLength(1);
        expect(screen.queryByText("Wishlist")).toBeNull();
    });
});

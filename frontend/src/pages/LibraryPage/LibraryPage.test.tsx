import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { MyProfile } from "@playrates/shared";
import { server } from "../../test/msw/server";
import { renderWithProviders } from "../../test/renderWithProviders";
import { buildGame, buildProfile } from "../../test/msw/handlers";
import LibraryPage from "./LibraryPage";

let user: MyProfile | null = null;
vi.mock("../../contexts/AuthContext", () => ({ useAuth: () => ({ user }) }));
// The tiles' actions are their own tests; here they need no log flow.
vi.mock("../../components/game/useTileActions", () => ({
    useTileActions: () => ({
        actionsFor: () => [],
        statusFor: () => null,
        logFor: () => undefined,
    }),
}));

const API = "http://localhost:3000/api/v1";
const page = (data: ReturnType<typeof buildGame>[]) => ({
    data,
    meta: { page: 1, limit: 24, total: data.length },
});
const silksong = buildGame({ id: 77, title: "Hollow Knight: Silksong" });

/* The catalogue only holds what someone has already searched for; the
   masthead's search reached past it, the library's never did. */
describe("LibraryPage search past the catalogue", () => {
    beforeEach(() => {
        user = buildProfile();
        server.use(
            http.get(`${API}/genres`, () => HttpResponse.json({ data: [] }))
        );
    });

    it("finds a game the catalogue lacked and shows it in the grid", async () => {
        let imported = false;
        const searched = vi.fn();
        server.use(
            http.get(`${API}/games`, () =>
                HttpResponse.json(page(imported ? [silksong] : []))
            ),
            http.get(`${API}/games/search`, ({ request }) => {
                searched(new URL(request.url).searchParams.get("q"));
                imported = true;
                return HttpResponse.json(page([silksong]));
            })
        );
        renderWithProviders(<LibraryPage />, { route: "/library?q=silksong" });

        expect(
            await screen.findByText("Hollow Knight: Silksong")
        ).toBeInTheDocument();
        expect(searched).toHaveBeenCalledWith("silksong");
    });

    it("says nothing matched when the wider catalogue has nothing either", async () => {
        server.use(
            http.get(`${API}/games`, () => HttpResponse.json(page([]))),
            http.get(`${API}/games/search`, () => HttpResponse.json(page([])))
        );
        renderWithProviders(<LibraryPage />, { route: "/library?q=zzqx" });

        expect(
            await screen.findByText("No titles match those filters")
        ).toBeInTheDocument();
    });

    /* A near miss isn't the game meant: say so, and still look further,
       since the catalogue may not have it yet. */
    it("shows the closest titles for a near miss, and still looks further", async () => {
        const searched = vi.fn();
        const witcher = buildGame({ id: 5, title: "The Witcher 3: Wild Hunt" });
        server.use(
            http.get(`${API}/games`, () =>
                HttpResponse.json({
                    data: [witcher],
                    meta: { page: 1, limit: 24, total: 1, approximate: true },
                })
            ),
            http.get(`${API}/games/search`, ({ request }) => {
                searched(new URL(request.url).searchParams.get("q"));
                return HttpResponse.json(page([witcher]));
            })
        );
        renderWithProviders(<LibraryPage />, { route: "/library?q=witchr" });

        expect(
            await screen.findByText("The Witcher 3: Wild Hunt")
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                "Nothing is called “witchr”, so these are the closest titles."
            )
        ).toBeInTheDocument();
        await vi.waitFor(() => expect(searched).toHaveBeenCalledWith("witchr"));
    });

    /* The endpoint is behind a session, as the masthead's typeahead is. */
    it("does not reach past the catalogue for someone signed out", async () => {
        user = null;
        const searched = vi.fn();
        server.use(
            http.get(`${API}/games`, () => HttpResponse.json(page([]))),
            http.get(`${API}/games/search`, () => {
                searched();
                return HttpResponse.json(page([]));
            })
        );
        renderWithProviders(<LibraryPage />, { route: "/library?q=silksong" });

        expect(
            await screen.findByText("No titles match those filters")
        ).toBeInTheDocument();
        expect(searched).not.toHaveBeenCalled();
    });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../../../test/msw/server";
import {
    buildGame,
    buildGameLog,
    buildShelfEntry,
} from "../../../test/msw/handlers";
import { renderWithProviders } from "../../../test/renderWithProviders";
import WishlistTop from "./WishlistTop";

vi.mock("../lib/useShelfTileActions", () => ({
    useShelfTileActions: () => ({ buildTileActions: () => [] }),
}));

const API = "http://localhost:3000/api/v1";

let wished: number[];
let asked: string | null;

beforeEach(() => {
    asked = null;
    server.use(
        http.get(`${API}/users/:username/wishlist`, ({ request }) => {
            asked = new URL(request.url).searchParams.get("limit");
            const limit = Number(asked ?? wished.length);
            return HttpResponse.json({
                data: wished.slice(0, limit).map((id, i) => ({
                    ...buildShelfEntry([
                        buildGameLog({
                            id,
                            gameId: id,
                            status: "wishlist",
                            game: buildGame({ id, title: `Game ${id}` }),
                        }),
                    ]),
                    rank: i + 1,
                    consoles: [null],
                })),
                total: wished.length,
                consoles: [],
            });
        })
    );
});

const render = (isMyAccount: boolean) =>
    renderWithProviders(
        <WishlistTop username="devuser" isMyAccount={isMyAccount} canSee />
    );

describe("WishlistTop", () => {
    it("shows the first five in order, and the way to the rest", async () => {
        wished = [7, 3, 9, 1, 4, 2, 8];
        render(false);

        const link = await screen.findByRole("link", { name: "See all 7" });
        expect(link).toHaveAttribute(
            "href",
            "/user/devuser/games?type=wishlist"
        );
        expect(asked).toBe("5");
        expect(
            screen.getAllByText(/^#\d$/).map((el) => el.textContent)
        ).toEqual(["#1", "#2", "#3", "#4", "#5"]);
    });

    it("says nothing on someone else's profile with nothing wished for", async () => {
        wished = [];
        const { container } = render(false);

        await waitFor(() => expect(asked).toBe("5"));
        await waitFor(() => expect(container).toBeEmptyDOMElement());
    });

    it("points its owner to the library when there's nothing on it", async () => {
        wished = [];
        render(true);

        expect(
            await screen.findByRole("link", { name: "Browse the library" })
        ).toBeInTheDocument();
    });
});

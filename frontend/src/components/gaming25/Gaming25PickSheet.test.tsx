import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import {
    GAMING_25_CATEGORIES,
    type Gaming25,
    type Gaming25Pick,
} from "@playrates/shared";
import { server } from "../../test/msw/server";
import { buildGame } from "../../test/msw/handlers";
import { renderWithProviders } from "../../test/renderWithProviders";
import Gaming25PickSheet from "./Gaming25PickSheet";

vi.mock("../../contexts/AuthContext", () => ({
    useAuth: () => ({ user: null }),
    useUser: () => null,
}));

const API = "http://localhost:3000/api/v1";
const portal = buildGame({ id: 4, title: "Portal" });

const gridWith = (picks: Gaming25Pick[]): Gaming25 => ({
    owner: {
        username: "devuser",
        avatarUrl: null,
        accent: "indigo",
        cardTheme: "default",
    },
    picks,
    loveCount: 0,
    lovedByViewer: false,
    updatedAt: null,
});

let saved: string[];

beforeEach(() => {
    saved = [];
    server.use(
        http.get(`${API}/games/search`, () =>
            HttpResponse.json({
                data: [portal],
                meta: { page: 1, limit: 6, total: 1 },
            })
        ),
        http.put(`${API}/me/gaming-25/picks/:category`, ({ params }) => {
            saved.push(String(params.category));
            return HttpResponse.json(gridWith([]));
        }),
        http.get(`${API}/users/devuser/gaming-25`, () =>
            HttpResponse.json(gridWith([]))
        )
    );
});

const pickPortal = async () => {
    const user = userEvent.setup({ delay: null });
    await user.type(screen.getByRole("combobox"), "Portal");
    await user.click(await screen.findByRole("option", { name: /Portal/ }));
};

describe("Gaming25PickSheet", () => {
    it("saves a pick and moves on to the next empty cell", async () => {
        renderWithProviders(
            <Gaming25PickSheet
                grid={gridWith([{ category: "best_soundtrack", game: portal }])}
                start="overrated"
                onClose={vi.fn()}
                onComplete={vi.fn()}
            />
        );
        expect(
            screen.getByRole("heading", { name: "Overrated" })
        ).toBeInTheDocument();

        await pickPortal();

        await waitFor(() => expect(saved).toEqual(["overrated"]));
        // Best soundtrack is filled, so on past it.
        expect(
            screen.getByRole("heading", { name: "Hardest game" })
        ).toBeInTheDocument();
    });

    it("says it's done when the last empty cell is filled", async () => {
        const onComplete = vi.fn();
        const all = GAMING_25_CATEGORIES.filter(
            (c) => c.key !== "best_indie"
        ).map((c) => ({ category: c.key, game: portal }));
        renderWithProviders(
            <Gaming25PickSheet
                grid={gridWith(all)}
                start="best_indie"
                onClose={vi.fn()}
                onComplete={onComplete}
            />
        );

        await pickPortal();

        expect(onComplete).toHaveBeenCalledOnce();
        await waitFor(() => expect(saved).toEqual(["best_indie"]));
    });
});

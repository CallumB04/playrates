import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../../test/msw/server";
import { buildGame } from "../../../test/msw/handlers";
import { renderWithProviders } from "../../../test/renderWithProviders";
import FavouritesEditor from "./FavouritesEditor";

vi.mock("../../../contexts/AuthContext", () => ({
    useAuth: () => ({ user: { username: "devuser" } }),
}));

const API = "http://localhost:3000/api/v1";

const games = [1, 2, 3].map((id) =>
    buildGame({ id, title: `Game ${id}`, slug: `game-${id}` })
);

let saved: number[] | null = null;

beforeEach(() => {
    saved = null;
    server.use(
        http.put(`${API}/me/favourites`, async ({ request }) => {
            saved = ((await request.json()) as { gameIds: number[] }).gameIds;
            return HttpResponse.json([]);
        })
    );
});

const setup = (current = games) => {
    const onClose = vi.fn();
    renderWithProviders(
        <FavouritesEditor current={current} onClose={onClose} />
    );
    return { onClose, user: userEvent.setup({ delay: null }) };
};

describe("FavouritesEditor", () => {
    it("saves them in the order they were put in", async () => {
        const { onClose, user } = setup();

        await user.click(
            screen.getByRole("button", { name: "Move Game 3 up" })
        );
        await user.click(screen.getByRole("button", { name: "Remove Game 1" }));
        await user.click(
            screen.getByRole("button", { name: "Save favourites" })
        );

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(saved).toEqual([3, 2]);
    });

    it("can't move the first up or the last down", () => {
        setup();
        expect(
            screen.getByRole("button", { name: "Move Game 1 up" })
        ).toBeDisabled();
        expect(
            screen.getByRole("button", { name: "Move Game 3 down" })
        ).toBeDisabled();
    });

    it("stops offering more at six", () => {
        setup(
            [1, 2, 3, 4, 5, 6].map((id) =>
                buildGame({ id, title: `Game ${id}`, slug: `game-${id}` })
            )
        );
        expect(screen.getByText(/That’s six/)).toBeInTheDocument();
    });
});

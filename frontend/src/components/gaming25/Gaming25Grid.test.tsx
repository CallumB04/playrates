import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Gaming25Pick } from "@playrates/shared";
import { buildGame } from "../../test/msw/handlers";
import { renderWithProviders } from "../../test/renderWithProviders";
import Gaming25Grid from "./Gaming25Grid";

const picks: Gaming25Pick[] = [
    {
        category: "all_time_favourite",
        game: buildGame({ id: 7, title: "Outer Wilds" }),
    },
    { category: "best_story", game: buildGame({ id: 8, title: "Disco" }) },
];

describe("Gaming25Grid", () => {
    it("lays out all 25, the favourite game in the middle", () => {
        renderWithProviders(<Gaming25Grid picks={picks} />);
        const cells = within(
            screen.getByRole("list", { name: "Gaming 25" })
        ).getAllByRole("listitem");

        expect(cells).toHaveLength(25);
        expect(cells[12]).toHaveAttribute("data-centre");
        expect(cells[12]).toHaveTextContent("Favourite Game");
    });

    it("links a visitor to each game, leaving the empty cells quiet", () => {
        renderWithProviders(<Gaming25Grid picks={picks} />);

        expect(
            screen.getByRole("link", { name: "Best Story: Disco" })
        ).toHaveAttribute("href", "/game/8");
        expect(screen.getAllByRole("link")).toHaveLength(2);
        expect(screen.queryByRole("button")).toBeNull();
    });

    it("makes every cell a button for its owner, empty ones included", async () => {
        const onPick = vi.fn();
        renderWithProviders(<Gaming25Grid picks={picks} onPick={onPick} />);

        expect(screen.getAllByRole("button")).toHaveLength(25);
        await userEvent.click(
            screen.getByRole("button", { name: "Hidden Gem: choose a game" })
        );
        await userEvent.click(
            screen.getByRole("button", {
                name: "Favourite Game: Outer Wilds",
            })
        );
        expect(onPick.mock.calls).toEqual([
            ["hidden_gem"],
            ["all_time_favourite"],
        ]);
    });
});

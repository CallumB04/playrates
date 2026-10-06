import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { buildGame } from "../../../test/msw/handlers";
import { renderWithProviders } from "../../../test/renderWithProviders";
import ReEntryPlate from "./ReEntryPlate";

const base = {
    username: "devuser",
    displayName: "Kai",
    backdrop: null,
    current: undefined,
    yearLogs: [],
    yearStats: undefined,
    starters: [buildGame({ id: 5, title: "Stray" })],
    isLogged: () => false,
    onAddStarter: vi.fn(async () => undefined),
    onUpdateLog: vi.fn(),
};

describe("ReEntryPlate", () => {
    it("offers a newcomer games to start from, beside their shelves", async () => {
        renderWithProviders(
            <ReEntryPlate {...base} isNew shelves={undefined} />
        );

        expect(
            screen.getByRole("heading", { name: "Welcome, Kai" })
        ).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole("button", { name: "Add Stray to your backlog" })
        );
        expect(base.onAddStarter).toHaveBeenCalledWith(base.starters[0]);
        expect(screen.getByRole("link", { name: /Backlog/ })).toHaveAttribute(
            "href",
            "/user/devuser?type=backlog"
        );
        expect(screen.getByText("Nothing on the go")).toBeInTheDocument();
    });

    it("says a starter already on the shelves is added", () => {
        renderWithProviders(
            <ReEntryPlate
                {...base}
                isNew
                shelves={undefined}
                isLogged={() => true}
            />
        );

        expect(
            screen.getByRole("button", { name: "Stray is on your shelves" })
        ).toHaveTextContent("Added");
    });

    it("shows a returning player their shelves instead", () => {
        renderWithProviders(
            <ReEntryPlate
                {...base}
                isNew={false}
                shelves={{ played: 12, playing: 1, backlog: 4, wishlist: 0 }}
            />
        );

        expect(
            screen.getByText("1 game in progress, 4 in your backlog.")
        ).toBeInTheDocument();
        expect(
            screen.getByRole("link", { name: /12\s*Played/ })
        ).toHaveAttribute("href", "/user/devuser?type=played");
        expect(
            screen.queryByRole("button", { name: /to your backlog/ })
        ).not.toBeInTheDocument();
    });
});
